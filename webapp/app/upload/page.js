import Link from "next/link";
import ZipImporter from "../../components/zip-importer";

export default function UploadPage() {
  return (
    <div className="main">
      <section className="panel">
        <div className="headerRow">
          <div>
            <p className="eyebrow">SUB HDC</p>
            <h1>นำเข้าไฟล์ข้อมูล</h1>
            <p className="lead">
              เลือกไฟล์ .zip — อัปโหลดอัตโนมัติ แล้วกดนำเข้า
            </p>
          </div>
          <Link href="/" className="navLink">
            ← แดชบอร์ด
          </Link>
        </div>
        <ZipImporter />
      </section>
    </div>
  );
}
