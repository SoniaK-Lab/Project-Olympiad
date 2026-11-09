import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';

const origin = 'http://127.0.0.1:5174';
let ready = false;
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    if ((await fetch(origin, {signal: AbortSignal.timeout(1500)})).ok) {
      ready = true;
      break;
    }
  } catch {}
  await delay(1000);
}
assert.ok(ready, 'Development server did not start');

const browser = await chromium.launch({executablePath: process.env.BRIDGE_TEST_CHROMIUM_PATH});
try {
  const page = await browser.newPage({timezoneId: 'Europe/Amsterdam'});
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + '/signin-with-chatgpt?return_to=%2Fui');
  await page.locator('#serverGate').waitFor({state: 'hidden'});
  await page.getByRole('button', {name: 'مدیریت کاربران'}).click();

  const mentorName = 'منتور آزمون';
  const studentName = 'دانشجوی آزمون';
  await page.locator('#memberName').fill(mentorName);
  await page.locator('#memberEmail').fill('mentor@example.test');
  await page.getByRole('button', {name: 'تعریف کاربر مجاز'}).click();
  const mentorRow = page.getByRole('row').filter({hasText: mentorName});
  await mentorRow.getByRole('button', {name: 'آماده‌سازی دعوت'}).click();
  assert.match(await page.getByRole('textbox', {name: 'متن دعوت قابل کپی'}).inputValue(), /mentor@example\.test[\s\S]+\/signin-with-chatgpt\?return_to=%2Fui/);

  await page.locator('#memberName').fill(studentName);
  await page.locator('#memberEmail').fill('student@example.test');
  await page.locator('#memberRole').selectOption('student');
  await page.locator('#memberMentor').selectOption({label: mentorName});
  await page.getByRole('button', {name: 'تعریف کاربر مجاز'}).click();
  await page.getByRole('row').filter({hasText: studentName}).waitFor();
  await page.locator('#memberForm button').waitFor();

  const session = await page.evaluate(async ({mentorName, studentName}) => {
    const {members} = await api('members');
    const mentorId = members.find(member => member.name === mentorName).id;
    const studentId = members.find(member => member.name === studentName).id;
    const {id} = await api('sessions', 'POST', {mentorId, studentId, date: '2030-01-18', time: '01:00', goal: 'جلسهٔ آزمون'});
    await api('assignments', 'POST', {sessionId: id, title: 'تکلیف آزمون', instructions: 'شرح تکلیف برای دانشجوی آزمون'});
    await loadServer();
    return {studentId};
  }, {mentorName, studentName});

  await page.locator('#adminViewSelect').selectOption(session.studentId);
  await Promise.all([
    page.waitForEvent('load'),
    page.locator('#applyAdminView').click(),
  ]);
  await page.locator('#serverGate').waitFor({state: 'hidden'});
  await page.getByRole('button', {name: 'جلسات من'}).click();
  await page.locator('#allSessions').getByText('تکلیف آزمون', {exact: true}).waitFor();
  await page.getByRole('button', {name: 'تأیید حضور'}).click();
  await page.locator('#allSessions').getByText('✓ حضور تأیید شده', {exact: true}).waitFor();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', {name: 'دریافت فایل تقویم جلسات'}).click(),
  ]);
  const calendar = await readFile(await download.path(), 'utf8');
  assert.match(calendar, /DTSTART:20300117T213000Z\r\nDTEND:20300117T220000Z/);
  assert.match(calendar, /SUMMARY:جلسهٔ آزمون/);
  assert.deepEqual(errors, []);
  console.log('PASS: browser sign-in, enrollment, invitation, role switching, assignment display, attendance and calendar export');
} finally {
  await browser.close();
}
