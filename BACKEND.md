# بک‌اند پل بالینی

## ساختار

- Vinext و Cloudflare Workers برای اجرای سرور
- Cloudflare D1 برای کاربران، جلسات و پیشرفت
- ورود با ChatGPT از طریق میزبانی Sites؛ بدون ذخیرهٔ رمز عبور در برنامه
- کنترل نقش و رابطهٔ منتور و دانشجو در تمام عملیات سمت سرور

## شروع کار مدیر

سایت در انتشار فعلی خصوصی و فقط در اختیار مالک باقی می‌ماند. اولین ورود احراز هویت‌شده در این وضعیت، مدیر اولیه را ایجاد می‌کند. پیش از اضافه‌کردن افراد به دسترسی میزبانی، مدیر اولیه باید وارد شود.

در «مدیریت کاربران»، ابتدا منتور را با ایمیل واقعی حساب ChatGPT تعریف کنید؛ سپس دانشجو را به منتور متصل کنید. این فرم صرفاً کاربر را مجاز می‌کند و ایمیل ارسال نمی‌کند. فرد با اولین ورود ChatGPT به پروفایل مجاز متصل می‌شود. دسترسی خصوصی سایت در لایهٔ میزبانی نیز باید جداگانه اعطا شود.

حساب‌های نمایشی قبلی به حساب واقعی تبدیل نمی‌شوند. داده‌های محلی قبلی خودکار وارد سرور نمی‌شوند.

## مسیرها

| مسیر | کاربرد |
| --- | --- |
| GET /api/bridge/me | هویت و نقش فعلی |
| GET /api/bridge/members | کاربران قابل مشاهده با توجه به نقش |
| POST /api/bridge/members | تعریف منتور یا دانشجو؛ فقط مدیر |
| GET /api/bridge/sessions | جلسات مجاز برای حساب فعلی |
| POST /api/bridge/sessions | ایجاد جلسه توسط منتور یا مدیر |
| PATCH /api/bridge/sessions/:id | تغییر زمان و هدف؛ همراه version |
| DELETE /api/bridge/sessions/:id | حذف جلسه؛ همراه version |
| POST /api/bridge/sessions/:id/attendance | تأیید حضور توسط دانشجوی مربوط؛ همراه version |
| GET /api/bridge/progress | دریافت پیشرفت شخصی |
| PUT /api/bridge/progress | ذخیرهٔ پیشرفت شخصی؛ همراه version |

تغییر برنامه، تأیید حضور را پاک می‌کند. نوشتن هم‌زمان با نسخهٔ قدیمی با خطای 409 رد می‌شود. درخواست‌های نوشتن نیازمند Origin همان سایت و JSON هستند. تمام پاسخ‌های API با no-store بازمی‌گردند.

## اجرای محلی

Node.js مطابق engines در package.json و pnpm مطابق packageManager لازم است.

```bash
pnpm install
pnpm run db:generate
pnpm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_tiny_dracula.sql
pnpm run dev
```

مهاجرت را فقط یک بار روی هر پایگاه محلی اجرا کنید. اجرای managed preview بدون هویت معتبر، صفحهٔ ورود را نمایش می‌دهد. تست‌های API از هویت و پایگاه موقت استفاده می‌کنند و رمز یا کاربر واقعی نمی‌سازند.

```bash
node tests/backend.test.mjs
pnpm exec tsc --noEmit
```

مهاجرت‌های تولید در فرایند انتشار Sites اجرا می‌شوند. manifest با d1=DB نگهداری می‌شود. نقش‌ها نباید از ورودی مرورگر یا localStorage برای مجوزدهی پذیرفته شوند.

## محدودیت‌ها

اعلان ایمیلی، بازیابی حساب اختصاصی، تماس تصویری و پشتیبان‌گیری قابل مدیریت توسط کاربر هنوز اضافه نشده‌اند. ورود و خروج متعلق به ChatGPT است. از ذخیرهٔ دادهٔ شناسایی بیمار واقعی در کیس‌ها و یادداشت‌ها خودداری کنید. محدودیت اندازه برای پیشرفت وجود دارد و خطای هم‌زمانی به کاربر نمایش داده می‌شود. برای تغییر راه‌اندازی از خصوصی به عمومی، جریان ایجاد مدیر اولیه باید قبل از انتشار عمومی بازبینی شود.

## تغییر نقش توسط مدیر

مدیر می‌تواند از نوار «نمای مدیر» یکی از منتورها یا منتی‌های تعریف‌شده را انتخاب کند و با «بازگشت به مدیر» خارج شود. API در هر درخواست، هویت واقعی مدیر را بررسی و سپس نقش مؤثر کاربر انتخاب‌شده را اعمال می‌کند. هدر `X-Bridge-View-As` برای کاربران غیرمدیر رد می‌شود. `GET /api/bridge/admin-views` فهرست حساب‌های قابل انتخاب را فقط به مدیر می‌دهد. این حالت فقط پیش‌نمایش ظاهری نیست؛ تغییرات در داده‌های واقعی حساب انتخاب‌شده ذخیره می‌شوند و رابط این موضوع را صریحاً نمایش می‌دهد.

## تکلیف و بازخورد جلسات

هر تکلیف به یک جلسه و همان منتور و منتی متصل است. وضعیت‌ها: assigned → submitted → revision → submitted → approved. منتی در حالت assigned یا revision می‌تواند پیش‌نویس ذخیره یا پاسخ ارسال کند. منتور فقط پاسخ ارسال‌شده را بررسی می‌کند؛ پیش‌نویس و رویدادهای پیش‌نویس به او نمایش داده نمی‌شوند. درخواست اصلاح، ویرایش دوباره را برای منتی باز می‌کند. پس از تأیید نهایی، پاسخ بسته می‌شود.

مسیرها: GET/POST /api/bridge/assignments؛ GET /api/bridge/assignments/:id/history؛ POST /api/bridge/assignments/:id/answer با answer، submit و version؛ POST /api/bridge/assignments/:id/review با feedback، decision و version. پاسخ‌های ارسال‌شده و بازخوردها در assignment_events حفظ می‌شوند. ثبت تغییر و رویداد در batch اتمیک انجام می‌شود؛ تعارض نسخه با 409 رد می‌شود. در حالت کارکرد مدیر به‌جای کاربر، هویت واقعی و مؤثر هر دو در رویداد ثبت می‌شوند.

### تماس زندهٔ دونفره

`/api/bridge/calls/:sessionId` implements authenticated polling-based WebRTC signaling. Only the session's assigned mentor and mentee may join. Admin uses the existing explicit role view to participate as a member; a plain admin cannot observe call signaling. Each member has a 45-second device lease; duplicate tabs receive 409. Negotiation messages expire from reads after five minutes and are purged at the next join. Leave clears the participant lease and their messages. Audio/video is sent between browsers, never recorded by this backend.

The mentor offers; the student answers. Both explicitly press «پیوستن به تماس». Camera starts off unless enabled in preview. Camera/microphone controls replace tracks without renegotiating, and exiting closes the peer connection and devices. Network/signaling failures show a retry state rather than a false connected status.

Current transport uses Google public STUN for direct WebRTC. TURN relay is not configured, so restrictive/mobile networks may fail. Production reliability requires an authenticated TURN provider. Site audience remains owner-private; separately authorize real participants in Sites access before they can sign in. Demo `.invalid` accounts do not represent independent logins. Two-party media has not been verified across real external networks.

### بیمار مجازی واکنش‌پذیر

The mentee-only `virtual-patient` workspace adds an authored respiratory scenario. `source-ui/patient-engine.js` is the deterministic branching model; `source-ui/patient-ui.html` is its interface. Both are embedded into the served HTML and `document.ts`. Actions consume fictional simulation time and test-cost points. Untreated hypoxemia can deteriorate in the authored branches; oxygen changes the fictional saturation, while antimicrobial treatment never produces an immediate cure. Discharge while unstable ends with a review. The debrief reports reviewed objectives rather than clinical competency.

Progress stores only version, start/end flag and action IDs in `extras.virtualPatient` through the existing per-member progress API. State is recomputed by replay on reload. Managers see the learner's existing aggregate learning reports; they do not receive the simulator menu. This simulation has no patient data entry. Scenario physiology, test timings and costs are educational fiction; source guidance is linked on the page. Tests: `node tests/patient-engine.test.mjs`.

### فروم دانشجویی

`/api/bridge/forum` is a persistent peer-discussion space shared by all authorized mentees. Effective students create topics and replies, search by category/title/body, filter their own or unanswered threads, and mark other students' replies helpful. Mentors are denied on the server; effective admins read and moderate through pin/lock and soft deletion. Both names and the shared audience are disclosed in the UI; emails are not included in forum API responses. Admin impersonation records the actual actor separately.

Topic/reply lengths, posting limits (30 writes in ten minutes), pagination, bound search parameters, role/ownership checks, stale moderation versions and atomic locked-topic reply insertion are enforced server-side. Votes are idempotent by member/post. Deleted topics are inaccessible; deleted replies return a placeholder and no original text. User content is rendered as escaped plain text. Drafts remain in per-user sessionStorage until published. A 15-second foreground check indicates changed threads without replacing an unsent draft. No email or push notifications are sent by the forum.
