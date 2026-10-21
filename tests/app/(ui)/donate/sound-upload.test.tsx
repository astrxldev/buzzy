import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DonationSoundField } from "@/app/(ui)/donate/sound-upload";
import { FormProvider } from "@/components/form";

function renderField(amount: unknown) {
  return renderToStaticMarkup(
    <FormProvider id="sound-field-test" values={{ amount }} inDialog={false}>
      <DonationSoundField />
    </FormProvider>,
  );
}

test("sound upload stays visible and disabled below ten baht", () => {
  for (const amount of [undefined, "", 0, 9, 9.99]) {
    const html = renderField(amount);
    expect(html).toContain("อัปโหลดเสียง");
    expect(html).toContain("ไม่บังคับ");
    expect(html).toContain('disabled=""');
    expect(html).not.toContain('class="hidden"');
    expect(html).toContain("แนบเสียงได้เมื่อโดเนทตั้งแต่ 10 บาทขึ้นไป");
  }
});

test("sound upload becomes available at ten baht", () => {
  for (const amount of [10, "10", 10.01, "10.01", 100]) {
    const html = renderField(amount);
    expect(html).toContain("อัปโหลดเสียง");
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain("แนบเสียงได้เมื่อโดเนทตั้งแต่ 10 บาทขึ้นไป");
  }
});
