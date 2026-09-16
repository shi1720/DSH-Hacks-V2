import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('dashboard and review have no axe WCAG A/AA violations',async({page})=>{await page.goto('/');await page.locator('main[data-ready="true"]').waitFor();expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);await page.getByRole('button',{name:'Open review',exact:true}).click();expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);});
