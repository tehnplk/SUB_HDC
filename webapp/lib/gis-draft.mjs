// state ของหมุดร่างกลุ่มเปราะบาง: ติดโหมด → คลิกปักหมุด → ลากย้าย → คลิกหมุด
// เปิดฟอร์ม → ค้นชื่อ/กรอก → บันทึก. หมุด leaflet จริงอยู่ฝั่ง component
// reducer นี้ถือแค่ข้อมูล

export const EMPTY_DRAFT_FIELDS = {
  hospcode: "",
  pid: "",
  cid: "",
  fullname: "",
  sex: "",
  birth: "",
  vulnerable: "",
  addr_no: "",
  road: "",
  village_code: "",
  village_name: "",
};

const CLEARED_SEARCH = { personQuery: "", personResults: [], personError: "", personSearched: false };

export const INITIAL_DRAFT = {
  addMode: false,
  pos: null,
  formOpen: false,
  fields: EMPTY_DRAFT_FIELDS,
  saving: false,
  saveError: "",
  ...CLEARED_SEARCH,
  personSearching: false,
};

// ยกเลิก = เอาหมุดออก ปิดฟอร์ม ล้างผลค้น (ค่าที่กรอกไว้ถูกล้างตอนปักหมุดใหม่)
function cancelled(state) {
  return { ...state, pos: null, formOpen: false, saveError: "", ...CLEARED_SEARCH };
}

export function draftReducer(state, action) {
  switch (action.type) {
    case "toggleAdd":
      return { ...cancelled(state), addMode: !state.addMode };
    case "drop":
      // ไม่เลือกกลุ่มให้ล่วงหน้า — ผู้ใช้ต้องเลือกเองก่อนบันทึก
      return {
        ...state,
        pos: action.pos,
        fields: { ...EMPTY_DRAFT_FIELDS },
        formOpen: false,
        saveError: "",
        addMode: false,
      };
    case "move":
      return { ...state, pos: action.pos };
    case "openForm":
      return { ...state, formOpen: true };
    case "setField":
      return { ...state, fields: { ...state.fields, [action.field]: action.value } };
    case "typeName":
      return { ...state, fields: { ...state.fields, fullname: action.value }, personQuery: action.value };
    case "pickPerson":
      return { ...state, fields: { ...state.fields, ...action.person }, personQuery: "", personResults: [] };
    case "cancel":
      return cancelled(state);
    case "saveStart":
      return { ...state, saving: true, saveError: "" };
    case "saveFailed":
      return { ...state, saving: false, saveError: action.error };
    case "saved":
      return { ...cancelled(state), saving: false };
    case "searchReset":
      return { ...state, personResults: [], personError: "", personSearched: false };
    case "searchStart":
      return { ...state, personSearching: true };
    case "searchDone":
      return { ...state, personResults: action.items, personError: "", personSearched: true, personSearching: false };
    case "searchFailed":
      return { ...state, personResults: [], personError: action.error, personSearched: true, personSearching: false };
    default:
      throw new Error(`unknown draft action: ${action.type}`);
  }
}

// ค้นชื่อได้เมื่อเลือกหน่วยบริการแล้วและพิมพ์อย่างน้อย 2 ตัวอักษร —
// ต่ำกว่านั้นกว้างเกินไป กวาดทั้งแฟ้ม person / ได้คนทั้งอำเภอมาปนกัน
export function personSearchUrl(hospcode, query) {
  const q = query.trim();
  if (!hospcode || q.length < 2) return null;
  return `/api/gis/person-search?q=${encodeURIComponent(q)}&hospcode=${encodeURIComponent(hospcode)}`;
}
