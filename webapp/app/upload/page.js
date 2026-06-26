import Link from "next/link";
import ZipImporter from "../../components/zip-importer";

export default function UploadPage() {
  const centerName = process.env.CENTER_NAME || "เมือง";

  return (
    <div className="main">
      <section className="panel">
        <div className="headerRow">
          <div>
            <h4 className="pageHeaderTitle">SUB-HDC ศูนย์ข้อมูล{centerName}</h4>
            <h1 style={{ fontSize: "28px", margin: "0 0 10px" }}>นำเข้าไฟล์ข้อมูล</h1>
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
