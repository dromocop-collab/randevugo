import { compilePatterns, type Messages } from "../config";
import enErrorPatterns from "../messages/en/error-patterns.json";
import en_common from "../messages/en/common.json";
import en_marketing from "../messages/en/marketing.json";
import en_marketing_pages from "../messages/en/marketing-pages.json";
import en_legal from "../messages/en/legal.json";
import en_seo from "../messages/en/seo.json";
import en_storefront from "../messages/en/storefront.json";
import en_account from "../messages/en/account.json";
import en_dashboard_shell from "../messages/en/dashboard-shell.json";
import en_dashboard_a from "../messages/en/dashboard-a.json";
import en_dashboard_b from "../messages/en/dashboard-b.json";
import en_dashboard_c from "../messages/en/dashboard-c.json";
import en_businesses from "../messages/en/businesses.json";
import en_errors from "../messages/en/errors.json";
import en_services_editor from "../messages/en/services-editor.json";
import en_services_storefront from "../messages/en/services-storefront.json";
import en_services_ops from "../messages/en/services-ops.json";

// İngilizce sözlük paketi: messages/en/*.json burada birleşir. Yeni sözlük dosyası → buraya bir satır.
const en: Messages = { ...en_common, ...en_marketing, ...en_marketing_pages, ...en_legal, ...en_seo, ...en_storefront, ...en_account, ...en_dashboard_shell, ...en_dashboard_a, ...en_dashboard_b, ...en_dashboard_c, ...en_businesses, ...en_errors, ...en_services_editor, ...en_services_storefront, ...en_services_ops };
export default en;

/** Değişkenli sunucu mesajı kalıpları (messages/en/error-patterns.json). */
export const patterns = compilePatterns(enErrorPatterns);
