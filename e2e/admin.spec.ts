import { expect, test } from '@playwright/test';
import { API_URL, WEB_URL, fixture, login } from './helpers';

test.describe.configure({ mode: 'serial' });

test.describe('segurança do painel', () => {
  test('redireciona para o login e recusa senha errada', async ({ page }) => {
    await page.goto('/admin/pacotes');
    await expect(page).toHaveURL(/\/admin\/entrar$/);
    await page.getByLabel('E-mail').fill('cleides@example.com');
    await page.getByLabel('Senha').fill('senha-errada');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible();
  });

  test('a API recusa operações administrativas sem login', async ({ request }) => {
    const res = await request.post(`${API_URL}/admin/packages`, { data: { name: 'Invasão' } });
    expect(res.status()).toBe(401);
    const preview = await request.get(`${API_URL}/admin/preview`);
    expect(preview.status()).toBe(401);
  });
});

test.describe('gestão de conteúdo', () => {
  test('edita a capa, envia a foto de destaque e o site reflete', async ({ page, context }) => {
    await login(page);
    await page.getByRole('link', { name: 'Início' }).first().click();
    await page.getByLabel('Título principal').fill('Registre a magia do seu Natal');
    await expect(page.getByText('Alterações não salvas')).toBeVisible();

    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Substituir' }).first().click();
    await (await chooser).setFiles(fixture('foto-a.jpg'));
    await expect(page.getByText('Foto enviada')).toBeVisible();
    await page.getByLabel(/Descrição da foto/).fill('Família no cenário de Natal');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();
    await expect(page.getByText('Tudo salvo')).toBeVisible();

    const site = await context.newPage();
    await site.goto('/');
    await expect(site.getByRole('heading', { level: 1, name: 'Registre a magia do seu Natal' })).toBeVisible();
    await expect(site.getByRole('img', { name: 'Família no cenário de Natal' }).first()).toBeVisible();
  });

  test('avisa ao sair com alterações não salvas e permite descartar', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Sobre a fotógrafa' }).click();
    await page.getByLabel('Destaque do título').fill('Cleides!');
    await page.getByRole('link', { name: 'Pacotes e valores' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Sair sem salvar?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page).toHaveURL(/\/admin\/sobre$/);
    await page.getByRole('button', { name: 'Descartar' }).click();
    await expect(page.getByLabel('Destaque do título')).toHaveValue('Cleides.');
  });

  test('cria pacote em rascunho, valida preço, publica e despublica', async ({ page, context }) => {
    await login(page);
    await page.goto('/admin/pacotes/novo');
    await page.getByRole('button', { name: 'Publicar' }).click();
    await expect(page.getByText('Dê um nome ao pacote.').first()).toBeVisible();

    await page.getByLabel('Nome do pacote').fill('Ensaio Pais e Filhos');
    await page.getByLabel('Subtítulo (opcional)').fill('Um momento só de vocês.');
    await page.getByRole('button', { name: 'Publicar' }).click();
    await expect(page.getByText('Informe o preço para publicar.').first()).toBeVisible();

    await page.getByLabel('Preço', { exact: true }).fill('450');
    await page.getByRole('button', { name: 'Adicionar preço promocional' }).click();
    await page.getByLabel('Preço promocional').fill('500');
    await expect(page.getByText('O preço promocional deve ser menor que o preço normal.')).toBeVisible();
    await page.getByLabel('Preço promocional').fill('399');

    await page.getByRole('tab', { name: /O que está incluído/ }).click();
    await page.getByRole('button', { name: 'Duração' }).click();
    await page.getByLabel('Duração').fill('Até 45 min');
    await page.getByRole('button', { name: 'Adicionar item' }).click();
    await page.getByLabel('Item 1').fill('8 fotos digitais');
    await page.getByRole('button', { name: 'Salvar rascunho' }).click();
    await expect(page.getByText('Pacote salvo como rascunho.')).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/pacotes\/[0-9a-f-]{36}$/);

    const site = await context.newPage();
    await site.goto('/');
    await expect(site.getByRole('heading', { name: 'Mini Natal' })).toBeVisible();
    await expect(site.getByText('Ensaio Pais e Filhos')).toHaveCount(0);

    await page.getByRole('button', { name: 'Publicar' }).click();
    await expect(page.getByText('Pacote publicado no site!')).toBeVisible();
    await site.reload();
    await expect(site.getByRole('heading', { name: 'Ensaio Pais e Filhos' })).toBeVisible();
    await expect(site.getByText('De R$ 450')).toBeVisible();

    await page.getByRole('button', { name: 'Tirar do ar' }).click();
    await expect(page.getByText(/tirado do ar/)).toBeVisible();
    await site.reload();
    await expect(site.getByRole('heading', { name: 'Mini Natal' })).toBeVisible();
    await expect(site.getByText('Ensaio Pais e Filhos')).toHaveCount(0);
  });

  test('duplica e exclui pacote com confirmação', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: 'Pacotes e valores' }).click();
    await page.getByRole('button', { name: 'Duplicar' }).first().click();
    await expect(page.getByText('“Mini Natal (cópia)” criado como rascunho.')).toBeVisible();
    const card = page.locator('article', { hasText: 'Mini Natal (cópia)' });
    await card.getByRole('button', { name: 'Excluir' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir pacote' }).click();
    await expect(page.getByText('Pacote excluído.')).toBeVisible();
    await expect(page.locator('article', { hasText: 'Mini Natal (cópia)' })).toHaveCount(0);
  });

  test('envia fotos para a galeria, valida arquivos e publica', async ({ page, context }) => {
    await login(page);
    await page.getByRole('link', { name: 'Galeria de fotos' }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Enviar fotos' }).first().click();
    await (await chooser).setFiles([fixture('foto-a.jpg'), fixture('foto-b.jpg'), fixture('documento.txt'), fixture('pequena.jpg')]);
    await expect(page.getByText(/não é uma foto compatível/)).toBeVisible();
    await expect(page.getByText(/muito pequena/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/2 fotos enviadas como rascunho/)).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /Editar foto foto a/ }).click();
    await page.getByLabel('Título').fill('Irmãos brincando');
    await page.getByLabel('Álbum (opcional)').fill('Crianças');
    await page.getByRole('switch', { name: 'Mostrar no site' }).click();
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByText('Foto salva e publicada no site.')).toBeVisible();

    const site = await context.newPage();
    await site.goto('/#galeria');
    await expect(site.getByRole('button', { name: 'Ampliar: Irmãos brincando' })).toBeVisible();
    await site.getByRole('button', { name: 'Ampliar: Irmãos brincando' }).click();
    await expect(site.getByRole('dialog', { name: 'Foto ampliada' })).toBeVisible();
    await site.keyboard.press('Escape');
  });

  test('cria, busca, reordena e exclui perguntas frequentes', async ({ page, context }) => {
    await login(page);
    await page.getByRole('link', { name: 'Dúvidas frequentes' }).click();
    await page.getByRole('button', { name: 'Adicionar pergunta' }).first().click();
    await page.getByLabel('Pergunta', { exact: true }).fill('Posso levar acessórios para o ensaio?');
    await page.getByLabel('Resposta', { exact: true }).fill('Sim! Traga o que quiser:\n\n- Gorros\n- Mantas');
    await page.getByLabel('Posição no site').selectOption('0');
    await page.getByRole('button', { name: 'Salvar pergunta' }).click();
    await expect(page.getByText('Pergunta salva e publicada no site.')).toBeVisible();

    await page.getByLabel('Buscar pergunta').fill('acessorios');
    await expect(page.getByRole('list', { name: 'Perguntas' }).getByRole('listitem')).toHaveCount(1);
    await page.getByLabel('Buscar pergunta').fill('');

    const site = await context.newPage();
    await site.goto('/');
    const first = site.locator('#duvidas h3').first();
    await expect(first).toHaveText(/Posso levar acessórios/);
    await site.getByRole('button', { name: /Posso levar acessórios/ }).click();
    await expect(site.locator('#duvidas li', { hasText: 'Gorros' })).toBeVisible();

    await page.getByRole('button', { name: /Posso levar acessórios/ }).click();
    await page.getByRole('button', { name: 'Excluir pergunta' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir pergunta' }).click();
    await expect(page.getByText('Pergunta excluída.')).toBeVisible();
  });

  test('adiciona e duplica etapas sem limite fixo', async ({ page, context }) => {
    await login(page);
    await page.getByRole('link', { name: 'Como funciona' }).click();
    await page.getByRole('button', { name: 'Adicionar etapa' }).first().click();
    await page.getByLabel('Título da etapa').fill('Receba as fotos');
    await page.getByLabel('Descrição').fill('Entrega digital em alta resolução.');
    await page.getByRole('button', { name: 'Ícone download' }).click();
    await page.getByRole('button', { name: 'Salvar etapa' }).click();
    await expect(page.getByText('Etapa salva e publicada no site.')).toBeVisible();
    await page.locator('li', { hasText: 'Receba as fotos' }).getByRole('button', { name: 'Duplicar' }).click();
    await expect(page.getByText('Etapa duplicada como rascunho.')).toBeVisible();

    const site = await context.newPage();
    await site.goto('/');
    await expect(site.getByRole('heading', { name: 'Receba as fotos' })).toBeVisible();
    await expect(site.getByText('Passo 5')).toBeVisible();
    await expect(site.getByText('Receba as fotos (cópia)')).toHaveCount(0);
  });

  test('pré-visualização com rascunhos só para quem está logado', async ({ page, browser }) => {
    await login(page);
    await page.goto('/?preview=1');
    await expect(page.getByText(/Pré-visualização: itens em rascunho/)).toBeVisible();
    await expect(page.getByText('Receba as fotos (cópia)')).toBeVisible();

    const visitor = await browser.newPage();
    await visitor.goto(`${WEB_URL}/?preview=1`);
    await expect(visitor.getByText('Entre no painel para ver os rascunhos na pré-visualização.')).toBeVisible();
    await expect(visitor.getByText('Receba as fotos (cópia)')).toHaveCount(0);
  });
});
