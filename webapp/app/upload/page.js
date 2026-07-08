import Link from "next/link";
import { ArrowLeft, UploadCloud } from "lucide-react";
import ZipImporter from "../../components/zip-importer";

export default function UploadPage() {
  const centerName = process.env.CENTER_NAME || "เมือง";

  return (
    <div className="main uploadMain">
      <section className="panel uploadPanel">
        <div className="headerRow">
          <div className="titleRow">
            <span className="iconBadge">
              <UploadCloud aria-hidden="true" />
            </span>
            <div className="titleText">
              <h4 className="pageHeaderTitle">SUB-HDC {centerName}</h4>
              <h1 style={{ fontSize: "28px", margin: "0 0 10px" }}>นำเข้าไฟล์ข้อมูล</h1>
              <p className="lead">
                เลือกไฟล์ .zip — อัปโหลดแล้วส่งเข้าคิวนำเข้าอัตโนมัติ
              </p>
            </div>
          </div>
          <Link href="/" className="navLink">
            <ArrowLeft aria-hidden="true" />
            แดชบอร์ด
          </Link>
        </div>
        <ZipImporter />
      </section>
    </div>
  );
}
