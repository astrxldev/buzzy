import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FormIf, FormProvider } from "@/components/form";

function renderCondition(props: Record<string, unknown>) {
  return renderToStaticMarkup(
    <FormProvider
      id="predicate-test"
      values={{ amount: "11", artifact: true }}
      inDialog={false}
    >
      <FormIf {...props}>
        <span>Conditional field</span>
      </FormIf>
    </FormProvider>,
  );
}

test("FormIf preserves equality conditions and CSS-hidden children", () => {
  expect(renderCondition({ artifact: true })).not.toContain('class="hidden"');
  const hidden = renderCondition({ artifact: false });
  expect(hidden).toContain('class="hidden"');
  expect(hidden).toContain("Conditional field");
});

test("FormIf combines an optional predicate with equality conditions", () => {
  const when = (values: Record<string, unknown>) => Number(values.amount) > 10;
  expect(renderCondition({ when })).not.toContain('class="hidden"');
  expect(renderCondition({ when, artifact: true })).not.toContain(
    'class="hidden"',
  );
  expect(renderCondition({ when, artifact: false })).toContain(
    'class="hidden"',
  );
  expect(renderCondition({ when: () => false })).toContain('class="hidden"');
});
