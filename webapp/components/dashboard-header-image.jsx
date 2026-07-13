import Link from "next/link";

export default function DashboardHeaderImage() {
  return (
    <Link href="/" className="headerHomeLink" aria-label="ไปหน้า Landing">
      <span className="iconBadge headerImageBadge">
        <img src="/encrypted.png" alt="" className="headerImage" aria-hidden="true" />
      </span>
    </Link>
  );
}
