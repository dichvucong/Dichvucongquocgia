import { useRef, useState, type FormEvent } from "react";
import { Info } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { ROUTES } from "@/lib/routes";
import { useDocumentTitle } from "@/lib/use-document-title";
import { createLocalProfile, saveLocalProfile, type LocalProfile } from "@/lib/local-profile";
import "./an-sinh-xa-hoi.css";

type FieldProps = {
  id: string;
  label: string;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "tel";
  required?: boolean;
  full?: boolean;
};

function Field({
  id,
  label,
  placeholder,
  type = "text",
  inputMode,
  required,
  full,
}: FieldProps) {
  return (
    <div className={`insurance-field${full ? " insurance-field-full" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

const previewFields: Array<[string, string]> = [
  ["name", "Họ và tên"],
  ["nationalId", "Số định danh"],
  ["gender", "Giới tính"],
  ["dob", "Ngày sinh"],
  ["hometown", "Quê quán"],
  ["phone", "Số điện thoại"],
  ["socialdate", "Ngày tham gia BHXH"],
  ["socialamount", "Mức đóng BHXH"],
  ["healthdate", "Ngày tham gia BHYT"],
  ["healthamount", "Mức đóng BHYT"],
  ["bankName", "Ngân hàng"],
  ["bankAccount", "Số tài khoản"],
  ["bankOwner", "Chủ tài khoản"],
  ["benefitBank", "Ngân hàng thụ hưởng"],
  ["benefitAccount", "Số tài khoản thụ hưởng"],
  ["benefitOwner", "Người thụ hưởng"],
  ["note", "Ghi chú"],
];

export default function AnSinhXaHoi() {
  const formRef = useRef<HTMLFormElement>(null);
  const [hasBhxh, setHasBhxh] = useState(true);
  const [hasBhyt, setHasBhyt] = useState(false);
  const [voluntary, setVoluntary] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [savedProfile, setSavedProfile] = useState<LocalProfile | null>(null);
  const [nationalId, setNationalId] = useState("");

  useDocumentTitle("Thông tin bảo hiểm");

  function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const enteredNationalId = data.get("nationalId")?.toString().trim() ?? "";
    if (!/^\d{12}$/.test(enteredNationalId)) {
      event.currentTarget.querySelector<HTMLInputElement>("#nationalId")?.setCustomValidity("Vui lòng nhập đúng 12 chữ số.");
      event.currentTarget.querySelector<HTMLInputElement>("#nationalId")?.reportValidity();
      return;
    }
    event.currentTarget.querySelector<HTMLInputElement>("#nationalId")?.setCustomValidity("");
    const lines = previewFields.map(([key, label]) => {
      const value = data.get(key)?.toString().trim() || "—";
      return `${label}: ${value}`;
    });
    const coverage = [
      hasBhxh ? "BHXH" : "",
      hasBhyt ? "BHYT" : "",
      voluntary ? "BHXH tự nguyện" : "BHXH bắt buộc",
    ].filter(Boolean);
    const profile = createLocalProfile({
      ...Object.fromEntries(previewFields.map(([key]) => [key, data.get(key)?.toString().trim() || "—"])),
      coverage: coverage.join(", ") || "Chưa chọn",
    });
    saveLocalProfile(profile);
    window.localStorage.setItem("independent-service-last-profile-id", profile.id);
    window.location.assign(ROUTES.home);
  }

  function resetForm() {
    formRef.current?.reset();
    setHasBhxh(true);
    setHasBhyt(false);
    setVoluntary(false);
    setPreview(null);
    setSavedProfile(null);
    setNationalId("");
  }

  return (
    <PageShell
      title="Cập nhật thông tin dữ liệu bảo hiểm"
      subtitle="Thông tin bảo hiểm xã hội, bảo hiểm y tế và an sinh."
      back={{ href: ROUTES.home, label: "Quay lại" }}
      disclaimerTone="earthy"
    >
      <p className="insurance-demo-note" role="note">
        <Info aria-hidden="true" />
        Nhập thông tin biểu mẫu bằng dữ liệu giả.
      </p>

      <form ref={formRef} className="insurance-form" onSubmit={handlePreview}>
        <section className="insurance-card">
          <h2>I. THÔNG TIN CÁ NHÂN</h2>
          <div className="insurance-grid">
            <Field
              id="name"
              label="Họ và tên *"
              placeholder="Chỉ dùng tên giả để thử"
              required
              full
            />
            <div className="insurance-field insurance-field-full">
              <label htmlFor="nationalId">
                Số định danh (12 chữ số)
              </label>
              <input
                id="nationalId"
                name="nationalId"
                value={nationalId}
                onChange={(event) => setNationalId(event.target.value.replace(/\D/g, "").slice(0, 12))}
                inputMode="numeric"
                pattern="[0-9]{12}"
                minLength={12}
                maxLength={12}
                placeholder="Nhập 12 chữ số giả"
                required
                aria-describedby="national-id-help"
              />
              <small id="national-id-help">
                Nhập 12 chữ số giả để lưu hồ sơ trên thiết bị này.
              </small>
            </div>
            <div className="insurance-field">
              <label htmlFor="gender">Giới tính</label>
              <select id="gender" name="gender" defaultValue="Không chọn">
                <option>Không chọn</option>
                <option>Nam</option>
                <option>Nữ</option>
                <option>Khác</option>
              </select>
            </div>
            <Field id="dob" label="Ngày tháng năm sinh" type="date" />
            <Field
              id="hometown"
              label="Địa điểm quê quán"
              placeholder="Xã/phường, tỉnh/thành phố"
              full
            />
            <Field
              id="phone"
              label="Số điện thoại"
              type="tel"
              inputMode="tel"
              placeholder="Không nhập số điện thoại thật"
              full
            />
          </div>
        </section>

        <section className="insurance-card">
          <h2>II. LOẠI HÌNH BẢO HIỂM</h2>
          <div className="insurance-choices">
            <label>
              <input
                type="checkbox"
                name="bhxh"
                checked={hasBhxh}
                onChange={(event) => setHasBhxh(event.target.checked)}
              />
              Bảo hiểm xã hội (BHXH)
            </label>
            <label>
              <input
                type="checkbox"
                name="bhyt"
                checked={hasBhyt}
                onChange={(event) => setHasBhyt(event.target.checked)}
              />
              Bảo hiểm y tế (BHYT)
            </label>
          </div>
          <div className="insurance-choices insurance-choices-spaced">
            <label>
              <input
                type="radio"
                name="bhxhType"
                value="BHXH bắt buộc"
                checked={!voluntary}
                onChange={() => setVoluntary(false)}
              />
              BHXH bắt buộc
            </label>
            <label>
              <input
                type="radio"
                name="bhxhType"
                value="BHXH tự nguyện"
                checked={voluntary}
                onChange={() => setVoluntary(true)}
              />
              BHXH tự nguyện
            </label>
            <label>
              <input type="checkbox" name="bhytFamily" />
              BHYT hộ gia đình
            </label>
            <label>
              <input type="checkbox" name="bhytOther" />
              BHYT theo đối tượng khác
            </label>
          </div>
        </section>

        <section className="insurance-card">
          <h2>III. THÔNG TIN THAM GIA</h2>
          {hasBhxh && !voluntary && (
            <div className="insurance-grid">
              <Field id="socialdate" label="Ngày tham gia BHXH" type="date" />
              <Field
                id="socialamount"
                label="Mức đóng BHXH (VNĐ/tháng)"
                inputMode="numeric"
                placeholder="Nhập số liệu"
              />
            </div>
          )}
          {hasBhxh && voluntary && (
            <div className="insurance-subsection">
              <h3>THÔNG TIN TÀI KHOẢN NHẬN TRỢ CẤP XÃ HỘI</h3>
              <p className="insurance-inline-note">
                Mức hưởng thực tế phụ thuộc quy định hiện hành và cơ quan có thẩm quyền.
              </p>
              <div className="insurance-grid">
                <Field id="bank" label="Tên ngân hàng" full />
                <Field
                  id="accountName"
                  label="Tên chủ tài khoản"
                  full
                />
                <Field
                  id="accountNumber"
                  label="Số tài khoản"
                  inputMode="numeric"
                  placeholder="Không nhập số tài khoản thật"
                  full
                />
                <Field id="bankBranch" label="Chi nhánh ngân hàng" full />
                <div className="insurance-field insurance-field-full">
                  <label htmlFor="benefitAmount">Mức trợ cấp</label>
                  <input
                    id="benefitAmount"
                    value="Kiểm tra chính sách hiện hành"
                    readOnly
                  />
                </div>
              </div>
            </div>
          )}
          {hasBhyt && (
            <div className="insurance-grid insurance-grid-spaced">
              <Field id="healthdate" label="Ngày tham gia BHYT" type="date" />
              <Field
                id="healthamount"
                label="Mức đóng BHYT (VNĐ)"
                inputMode="numeric"
                placeholder="Nhập số liệu"
              />
            </div>
          )}
        </section>

        <section className="insurance-card">
          <h2>IV. THÔNG TIN TÀI KHOẢN NGÂN HÀNG</h2>
          <div className="insurance-grid">
            <Field id="bankName" label="Tên ngân hàng" placeholder="Dữ liệu giả" full />
            <Field
              id="bankAccount"
              label="Số tài khoản"
              inputMode="numeric"
              placeholder="Không nhập số tài khoản thật"
              full
            />
            <Field id="bankOwner" label="Họ và tên chủ tài khoản" placeholder="Dữ liệu giả" full />
          </div>
        </section>

        <section className="insurance-card">
          <h2>V. TÀI KHOẢN THỤ HƯỞNG</h2>
          <div className="insurance-grid">
            <Field id="benefitBank" label="Tên ngân hàng thụ hưởng" full />
            <Field
              id="benefitAccount"
              label="Số tài khoản thụ hưởng"
              inputMode="numeric"
              placeholder="Không nhập số tài khoản thật"
              full
            />
            <Field id="benefitOwner" label="Họ và tên người thụ hưởng" full />
            <div className="insurance-field insurance-field-full">
              <label htmlFor="note">Ghi chú</label>
              <textarea
                id="note"
                name="note"
                placeholder="Nhập nội dung bổ sung"
              />
            </div>
          </div>
          <p className="insurance-small">
            Trang này không xác nhận quyền hưởng, không tiếp nhận hồ sơ và không
            thực hiện chi trả.
          </p>
          <div className="insurance-actions">
            <button className="insurance-button insurance-primary" type="submit">
              Lưu hồ sơ
            </button>
            <button
              className="insurance-button insurance-secondary"
              type="button"
              onClick={resetForm}
            >
              Xóa nội dung
            </button>
          </div>
        </section>
      </form>

      {preview && (
        <section className="insurance-card insurance-preview" aria-live="polite">
          <h2>PHIẾU KÊ KHAI</h2>
          <pre>{preview}</pre>
          {savedProfile && (
            <p className="insurance-inline-note" role="status">
              Mã hồ sơ của bạn: <strong>{savedProfile.id}</strong>. Mã này chỉ được lưu trên trình duyệt này.
            </p>
          )}
          <div className="insurance-actions">
            <a className="insurance-button insurance-primary" href={ROUTES.dataLookup}>Mở Dữ liệu cá nhân</a>
            <button
              className="insurance-button insurance-secondary"
              type="button"
              onClick={() => window.print()}
            >
              In phiếu
            </button>
          </div>
        </section>
      )}
    </PageShell>
  );
}
