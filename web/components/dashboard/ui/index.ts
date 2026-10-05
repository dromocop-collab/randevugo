/* İşletme paneli ortak UI kiti. Vurgu renkleri görünüm temasından (--dash-*) gelir; koyu mod ve
   prefers-reduced-motion desteklenir. Token'lar DashboardShell kökünde uygulanır (--dui-*). */
export {
  dashTokensClassName, toneClassName,
  DashPage, PageHeader, Panel,
  StatGrid, StatCard, TrendPill, percentChange,
  Badge, StatusPill, appointmentStatusMeta,
  Button,
  Toolbar, SearchField, SelectField, SegmentedControl,
  Field, FormGrid, Input, Textarea, NativeSelect, Switch,
  inputClassName, selectClassName, textareaClassName,
  EmptyState, Skeleton, SkeletonList, Callout, KeyValueList,
  List, ListRow,
  DataTable, Sheet, ConfirmSheet,
} from "./dash-ui";
export type { DashTone, StatTrend, ButtonVariant, DashButtonProps, DataColumn } from "./dash-ui";
