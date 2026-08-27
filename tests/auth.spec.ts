import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByText('Anmelden').first()).toBeVisible()
    await expect(page.getByLabel('E-Mail')).toBeVisible()
    await expect(page.getByLabel('Passwort')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Anmelden' })).toBeVisible()
  })

  test('login form fields are interactive', async ({ page }) => {
    await page.goto('/login')

    const emailInput = page.getByLabel('E-Mail')
    const passwordInput = page.getByLabel('Passwort')

    await emailInput.fill('test@firma.de')
    await passwordInput.fill('password123')

    await expect(emailInput).toHaveValue('test@firma.de')
    await expect(passwordInput).toHaveValue('password123')
  })

  test('login form shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('E-Mail').fill('invalid@firma.de')
    await page.getByLabel('Passwort').fill('wrongpassword')
    await page.getByRole('button', { name: 'Anmelden' }).click()

    await expect(
      page.getByText('Ungültige Anmeldedaten')
    ).toBeVisible({ timeout: 10000 })
  })

  test('login page is accessible at /login without redirect', async ({ page }) => {
    const response = await page.goto('/login')
    expect(response?.status()).toBeLessThan(400)
    await expect(page).toHaveURL(/\/login/)
  })
})
