import ZipImporter from "../../components/zip-importer";
import ModuleHeader from "@/components/module-header";

export default function UploadPage() {
  const centerName = process.env.CENTER_NAME || "เมือง";

  return (
    <div className="main uploadMain">
      <section className="panel panelWide uploadPanel">
        <ModuleHeader
          subtitle={`นำเข้าไฟล์ข้อมูล ${centerName ? `สำหรับ ${centerName}` : ""}`}
        />
        <ZipImporter />
      </section>
    </div>
  );
}
