import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const apiSource = readFileSync(new URL("../app/api/admin/users/route.js", import.meta.url), "utf8");
const pageSource = readFileSync(new URL("../app/admin/page.js", import.meta.url), "utf8");
const clientSource = readFileSync(new URL("../app/admin/user-manager.jsx", import.meta.url), "utf8");
const floatingMenuSource = readFileSync(new URL("../components/floating-user-menu.jsx", import.meta.url), "utf8");
const authSource = readFileSync(new URL("../auth.js", import.meta.url), "utf8");
const providerAuthSource = readFileSync(new URL("../lib/provider-auth.js", import.meta.url), "utf8");
const moduleHeaderSource = readFileSync(new URL("../components/module-header.jsx", import.meta.url), "utf8");
const layoutSource = readFileSync(new URL("../app/layout.js", import.meta.url), "utf8");
const proxySource = readFileSync(new URL("../proxy.js", import.meta.url), "utf8");
const guestErrorSource = readFileSync(new URL("../app/err/page.js", import.meta.url), "utf8");

test("admin page and API enforce the configured account and ProviderID role ID independently", () => {
  assert.match(pageSource, /isAdminSession\(session\)/);
  assert.match(apiSource, /requireAdminApi\(\)/);
  assert.match(authSource, /isConfiguredUser:\s*true/);
  assert.match(authSource, /roleId:\s*providerUser\.roleId/);
  assert.match(providerAuthSource, /u\.role AS role_id/);
});

test("admin API lists safe user fields and updates role id status and note", () => {
  assert.match(apiSource, /u\.role AS role_id/);
  assert.match(apiSource, /r\.role AS role_name/);
  assert.match(apiSource, /h\.hospname/);
  assert.match(apiSource, /r\.note AS role_note/);
  assert.match(apiSource, /u\.login_count/);
  assert.doesNotMatch(apiSource, /SELECT[^;]*(cid_hash|profile)/);
  assert.match(apiSource, /UPDATE c_user_provider SET role = \?, is_active = \?, note = \? WHERE id = \?/);
  assert.match(apiSource, /DELETE FROM c_user_provider WHERE id = \?/);
  assert.match(apiSource, /You cannot delete your own account/);
  assert.match(apiSource, /role_id/);
  assert.match(apiSource, /roleId !== 1/);
  assert.match(apiSource, /You cannot disable or demote your own account/);
});

test("admin UI supports search status role and edit actions", () => {
  assert.doesNotMatch(clientSource, /adminUsersIntro/);
  assert.match(clientSource, /<th>ID<\/th><th>USER<\/th><th>HOSPCODE<\/th><th>ROLE<\/th>/);
  assert.match(clientSource, /LOGIN \(ครั้ง\)/);
  assert.match(clientSource, /user\.login_count/);
  assert.match(clientSource, /user\.hospname/);
  assert.match(clientSource, /user\.role_note/);
  assert.match(clientSource, /Search user name/);
  assert.match(clientSource, /adminSearchInput/);
  assert.match(clientSource, /user\.fullname/);
  assert.match(clientSource, /Filter by role/);
  assert.match(clientSource, /Filter by status/);
  assert.match(clientSource, /roleFilter/);
  assert.match(clientSource, /statusFilter/);
  assert.match(clientSource, /of \$\{users\.length\} users/);
  assert.doesNotMatch(clientSource, /\{user\.provider_id\}/);
  assert.match(clientSource, /Account active/);
  assert.match(clientSource, /Save changes/);
  assert.match(clientSource, /adminActionButton adminEditButton/);
  assert.match(clientSource, /adminActionButton adminDeleteButton/);
  assert.match(clientSource, /Delete permanently/);
  assert.match(clientSource, /method: "DELETE"/);
  assert.match(clientSource, /fetch\("\/api\/admin\/users"/);
});

test("account menu is rendered to the right of the Import button in the header", () => {
  assert.match(moduleHeaderSource, /className="headerActions"/);
  assert.match(moduleHeaderSource, /FloatingUserMenu \{\.\.\.userSession\} variant="header"/);
});

test("guest account menu contains only the Login action", () => {
  assert.match(floatingMenuSource, /!isAuthenticated \? \(/);
  assert.match(floatingMenuSource, /href="\/login"/);
  assert.match(floatingMenuSource, /<span>Login<\/span>/);
});

test("signed-in profile menu shows the user and hospital details", () => {
  assert.match(floatingMenuSource, /userFullname \|\| userName \|\| providerId \|\| "Guest"/);
  assert.match(floatingMenuSource, /userAvatarInitial\?\.trim\(\)\.slice\(0, 1\)/);
  assert.match(floatingMenuSource, /<strong>\{displayName\}<\/strong>/);
  assert.match(floatingMenuSource, /hospitalLabel/);
  assert.match(floatingMenuSource, /userRoleNote/);
  assert.match(floatingMenuSource, /floatingUserRole/);
  assert.match(authSource, /token\.fullname = user\.fullname \|\| user\.name/);
  assert.match(layoutSource, /SELECT hospname FROM c_hospital/);
  assert.match(layoutSource, /SELECT role, note FROM c_user_role/);
  assert.match(layoutSource, /providerId: session\?\.user\?\.providerId/);
});

test("ProviderID profile stores the upstream hash_cid without retaining a raw CID", () => {
  assert.match(providerAuthSource, /profile\?\.hash_cid/);
  assert.match(providerAuthSource, /upstreamCidHash \|\|/);
  assert.match(providerAuthSource, /Array\.from\(firstText\(profile\?\.firstname_th\)\)/);
  assert.match(authSource, /avatarInitial: providerUser\.avatarInitial/);
  assert.match(authSource, /token\.profile = user\.profile/);
  assert.match(authSource, /session\.user\.profile = token\.profile/);
  assert.match(layoutSource, /session\?\.user\?\.profile\?\.firstname_th/);
});

test("ProviderID login counts the initial and returning successful logins", () => {
  assert.match(providerAuthSource, /login_count = login_count \+ 1/);
  assert.match(providerAuthSource, /login_count, last_activity/);
});

test("new ProviderID users are guests and protected routes deny guest access", () => {
  assert.match(providerAuthSource, /role = 'guest'/);
  assert.match(providerAuthSource, /role: "guest"/);
  assert.match(proxySource, /Number\(request\.auth\.user\.roleId\) === 4/);
  assert.match(proxySource, /new URL\("\/err", request\.nextUrl\.origin\)/);
  assert.match(proxySource, /กรุณาติดต่อผู้ดูแลระบบประจำอำเภอของท่าน\\nเพื่อขอสิทธิระดับ User ขึ้นไปในการเข้าถึงข้อมูลนี้/);
  assert.match(guestErrorSource, /showLogin=\{false\}/);
});

test("proxy reserves /admin and /api/admin for admin role only", () => {
  assert.match(proxySource, /ADMIN_ONLY_PAGE_PREFIXES = \["\/admin"\]/);
  assert.match(proxySource, /ADMIN_ONLY_API_PREFIXES = \["\/api\/admin"\]/);
  // admin = configured account หรือ roleId 1 (ตรงกับ isAdminSession)
  assert.match(proxySource, /request\.auth\.user\.isConfiguredUser === true/);
  assert.match(proxySource, /Number\(request\.auth\.user\.roleId\) === 1/);
  // non-admin ที่ล็อกอินแล้ว: API ตอบ 403, page redirect ไป /err
  assert.match(proxySource, /matchesPrefix\(pathname, ADMIN_ONLY_API_PREFIXES\)/);
  assert.match(proxySource, /matchesPrefix\(pathname, ADMIN_ONLY_PAGE_PREFIXES\)/);
  assert.match(proxySource, /ADMIN_PROTECTED_MESSAGE/);
});
