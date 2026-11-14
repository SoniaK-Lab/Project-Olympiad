import { getChatGPTUser } from '../../../chatgpt-auth';
import { database, csrf, body, response, HttpError } from '../../../../lib/bridge';
import { AuthError, nationalCode, passwordValue, randomToken, passwordHash, equalHash, digest, cookieToken, sessionCookie, createSession, throttle } from '../../../../lib/password-auth';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  try {
    csrf(req);
    const action = new URL(req.url).pathname.split('/').pop();
    const db = database();
    if (action === 'logout') {
      const token = cookieToken(req.headers.get('cookie'));
      if (token) await db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(await digest(token)).run();
      const result = response({ok: true}); result.headers.set('Set-Cookie', sessionCookie(req, '', 0)); return result;
    }
    if (action !== 'register' && action !== 'login') return response({error: 'مسیر پیدا نشد'}, 404);
    const ip = req.headers.get('cf-connecting-ip') || 'local';
    await throttle(action + ':ip:' + await digest(ip), action === 'register' ? 10 : 40);
    const data = await body(req);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new AuthError(400, 'اطلاعات فرم معتبر نیست');
    const code = nationalCode(data.nationalId);
    await throttle(action + ':account:' + await digest(code), 10);
    const password = passwordValue(data.password);
    let memberId: string;
    if (action === 'register') {
      if (password !== data.confirmPassword) throw new AuthError(400, 'رمز عبور و تکرار آن یکسان نیستند');
      if (await db.prepare('SELECT member_id FROM auth_accounts WHERE national_id=?').bind(code).first()) throw new AuthError(409, 'این کد ملی قبلاً ثبت‌نام کرده است؛ وارد شوید');
      // Existing accounts can be migrated only with their trusted host identity.
      // The national code alone never claims another member or elevates a role.
      const hostUser = await getChatGPTUser();
      const existing = hostUser ? await db.prepare('SELECT id FROM members WHERE identity=?').bind(hostUser.userId).first<{id: string}>() : null;
      if (existing && await db.prepare('SELECT member_id FROM auth_accounts WHERE member_id=?').bind(existing.id).first()) throw new AuthError(409, 'برای حساب فعلی قبلاً رمز ساخته شده است؛ از ورود استفاده کنید');
      memberId = existing?.id || crypto.randomUUID();
      const salt = randomToken(), hash = await passwordHash(password, salt);
      const statements = [];
      if (!existing) statements.push(db.prepare("INSERT INTO members(id,email,name,role,created) VALUES(?,?,?,'student',?)").bind(memberId, memberId + '@accounts.invalid', 'دانشجوی جدید', new Date().toISOString()));
      statements.push(db.prepare('INSERT INTO auth_accounts(national_id,member_id,password_hash,salt,created) VALUES(?,?,?,?,?)').bind(code, memberId, hash, salt, new Date().toISOString()));
      try { await db.batch(statements); } catch (error) {
        if (String(error).includes('UNIQUE constraint')) throw new AuthError(409, 'این حساب قبلاً ثبت‌نام کرده است؛ وارد شوید');
        throw error;
      }
    } else {
      const account = await db.prepare('SELECT member_id,password_hash,salt FROM auth_accounts WHERE national_id=?').bind(code).first<{member_id: string; password_hash: string; salt: string}>();
      const hash = await passwordHash(password, account?.salt || 'unregistered-account-dummy-salt');
      if (!account || !equalHash(hash, account.password_hash)) throw new AuthError(401, 'کد ملی یا رمز عبور اشتباه است');
      memberId = account.member_id;
    }
    const result = response({ok: true}, action === 'register' ? 201 : 200);
    result.headers.set('Set-Cookie', await createSession(req, memberId));
    // Bounded housekeeping; no identifiers or credentials are logged.
    await db.batch([db.prepare('DELETE FROM auth_sessions WHERE expires_at<?').bind(Date.now()), db.prepare('DELETE FROM auth_limits WHERE bucket<?').bind(Math.floor(Date.now() / 900000) - 1)]);
    return result;
  } catch (error) {
    if (error instanceof AuthError || error instanceof HttpError) return response({error: error.message}, error.status);
    console.error('Authentication operation failed');
    return response({error: 'ارتباط با سامانه برقرار نشد؛ دوباره تلاش کنید'}, 500);
  }
}
