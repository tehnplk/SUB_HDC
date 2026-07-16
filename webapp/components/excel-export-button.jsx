import { FileSpreadsheet } from "lucide-react";

export default function ExcelExportButton({
  href,
  onClick,
  disabled = false,
  className = "",
  label = "ส่งออก Excel",
  title,
  ariaLabel,
}) {
  const classes = `excelExportButton ${className}`.trim();
  const content = <><FileSpreadsheet aria-hidden="true" />{label}</>;

  if (href) {
    return <a className={classes} href={href} title={title} aria-label={ariaLabel}>{content}</a>;
  }

  return <button type="button" className={classes} onClick={onClick} disabled={disabled} title={title} aria-label={ariaLabel}>{content}</button>;
}
