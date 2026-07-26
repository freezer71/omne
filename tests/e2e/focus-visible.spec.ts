import { test, expect } from '@playwright/test';

// CSS cannot be asserted in jsdom, so the focus ring only has a real test here.
//
// The bug this guards: every tool renders its options as a styled <label> around
// an sr-only radio, and its file picker as an sr-only <input type="file"> beside
// a styled button. `sr-only` clips those controls to 1×1px, so the browser drew
// the focus ring on something invisible and keyboard users had no idea where
// they were.
//
// These tests must drive focus from the keyboard. `element.focus()` does not
// reliably set `:focus-visible`, so a programmatic version of this test would
// report whatever the browser felt like and prove nothing.

type Ring = { style: string; width: number; boxWidth: number };

async function ringOfActiveAncestor(page: import('@playwright/test').Page, sel: string) {
  return page.evaluate((s): Ring | null => {
    const target = (document.activeElement as HTMLElement | null)?.closest(s);
    if (!target) return null;
    const cs = getComputedStyle(target);
    return {
      style: cs.outlineStyle,
      width: parseFloat(cs.outlineWidth),
      boxWidth: target.getBoundingClientRect().width,
    };
  }, sel);
}

// Tabs until the focused element matches, so the test does not depend on how
// many header controls precede the tool. Direction matters: on the text tools
// the option chips sit *above* the input, so reaching them from the textarea
// means walking backwards.
async function tabUntil(
  page: import('@playwright/test').Page,
  sel: string,
  { back = false, max = 25 }: { back?: boolean; max?: number } = {},
) {
  const matches = () => page.evaluate((s) => document.activeElement?.matches(s) ?? false, sel);
  for (let i = 0; i < max; i++) {
    if (await matches()) return true;
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
  }
  return matches();
}

test.describe('focus is visible on controls that stand in for hidden inputs', () => {
  // WebKit does not put radios or buttons in the Tab order unless the user turns
  // on Full Keyboard Access, so there is no keyboard focus to observe there. The
  // rule under test is plain CSS and is not engine-specific.
  test.skip(({ browserName }) => browserName === 'webkit', 'WebKit skips these controls when tabbing');

  test('an option chip rings its label, not the clipped radio inside it', async ({ page }) => {
    await page.goto('/en/text/case');
    await page.locator('textarea').click();
    expect(await tabUntil(page, 'input[type="radio"]', { back: true })).toBe(true);

    // The control itself really is unusable as a focus target.
    const radioBox = await page.evaluate(
      () => document.activeElement!.getBoundingClientRect().width,
    );
    expect(radioBox).toBeLessThan(2);

    const ring = await ringOfActiveAncestor(page, 'label');
    expect(ring).not.toBeNull();
    expect(ring!.style).not.toBe('none');
    expect(ring!.width).toBeGreaterThan(0);
    // Drawn on something big enough to notice.
    expect(ring!.boxWidth).toBeGreaterThan(20);

    // And not painted twice: the hidden radio keeps no ring of its own.
    expect(await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)).toBe(
      'none',
    );
  });

  test('arrowing through the group moves the visible ring', async ({ page }) => {
    await page.goto('/en/text/case');
    await page.locator('textarea').click();
    await tabUntil(page, 'input[type="radio"]', { back: true });

    const first = await page.evaluate(() => document.activeElement?.closest('label')?.textContent);
    await page.keyboard.press('ArrowRight');
    const second = await page.evaluate(() => document.activeElement?.closest('label')?.textContent);

    expect(second).not.toBe(first);
    const ring = await ringOfActiveAncestor(page, 'label');
    expect(ring!.style).not.toBe('none');
  });

  test('an unfocused chip carries no ring', async ({ page }) => {
    await page.goto('/en/text/case');
    // Browsers report a default outline-width even when the style is `none`,
    // so the style is the only meaningful signal.
    const style = await page.evaluate(
      () => getComputedStyle(document.querySelector('label:has(input[type="radio"])')!).outlineStyle,
    );
    expect(style).toBe('none');
  });

  test('a file picker rings its button, not the clipped input', async ({ page }) => {
    await page.goto('/en/pdf/merge');
    await page.locator('h1').click();
    expect(await tabUntil(page, 'input[type="file"]')).toBe(true);

    const result = await page.evaluate(() => {
      const input = document.activeElement as HTMLElement;
      const button = input.nextElementSibling as HTMLElement | null;
      if (!button || button.tagName !== 'BUTTON') return null;
      return {
        onInput: getComputedStyle(input).outlineStyle,
        onButton: getComputedStyle(button).outlineStyle,
        buttonWidth: button.getBoundingClientRect().width,
      };
    });

    expect(result).not.toBeNull();
    expect(result!.onInput).toBe('none');
    expect(result!.onButton).not.toBe('none');
    expect(result!.buttonWidth).toBeGreaterThan(20);
  });
});
