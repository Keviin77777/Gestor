# 📱 Guia de Responsividade Mobile - GestPlay

## ✨ Componentes Responsivos Criados

### 1. Classes CSS Globais (já aplicadas em `globals.css`)

```css
/* Containers */
.container-responsive  /* px-4 sm:px-6 lg:px-8 */
.p-responsive         /* p-3 sm:p-4 md:p-6 */
.px-responsive        /* px-3 sm:px-4 md:px-6 */
.py-responsive        /* py-3 sm:py-4 md:py-6 */

/* Texto */
.text-responsive-sm   /* text-xs sm:text-sm */
.text-responsive-base /* text-sm sm:text-base */
.text-responsive-lg   /* text-base sm:text-lg */
.text-responsive-xl   /* text-lg sm:text-xl md:text-2xl */
.text-responsive-2xl  /* text-xl sm:text-2xl md:text-3xl */

/* Grid */
.grid-responsive-2    /* 1 col mobile, 2 cols desktop */
.grid-responsive-3    /* 1 col mobile, 2 cols tablet, 3 cols desktop */
.grid-responsive-4    /* 1 col mobile, 2 cols tablet, 4 cols desktop */

/* Flex */
.flex-responsive      /* flex-col mobile, flex-row desktop */

/* Tabelas */
.table-responsive     /* overflow-x-auto com scroll horizontal */
.custom-scrollbar     /* scrollbar estilizada */

/* Diálogos */
.dialog-responsive    /* max-w-[95vw] sm:max-w-lg md:max-w-2xl lg:max-w-4xl */

/* Botões */
.btn-responsive       /* text-sm sm:text-base px-3 sm:px-4 */
.tap-target          /* min 44x44px para touch */

/* Visibilidade */
.hide-mobile         /* hidden sm:block */
.show-mobile         /* block sm:hidden */
```

### 2. Componentes React (em `src/components/ui/responsive-container.tsx`)

```tsx
import {
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveCard,
  ResponsiveTableWrapper,
  ResponsiveDialogContent,
  ResponsiveButtonGroup,
  ResponsiveText
} from '@/components/ui/responsive-container';
```

## 🔧 Como Aplicar em Cada Tipo de Componente

### Páginas

**Antes:**
```tsx
<div className="p-6 space-y-6">
  <h1 className="text-2xl font-bold">Título</h1>
  {/* conteúdo */}
</div>
```

**Depois:**
```tsx
<ResponsiveContainer>
  <ResponsiveText size="2xl" className="font-bold">Título</ResponsiveText>
  {/* conteúdo */}
</ResponsiveContainer>
```

### Grids de Cards

**Antes:**
```tsx
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
  <Card>...</Card>
  <Card>...</Card>
</div>
```

**Depois:**
```tsx
<ResponsiveGrid cols={4}>
  <Card className="p-responsive">...</Card>
  <Card className="p-responsive">...</Card>
</ResponsiveGrid>
```

### Tabelas

**Antes:**
```tsx
<div className="overflow-x-auto">
  <Table>...</Table>
</div>
```

**Depois:**
```tsx
<ResponsiveTableWrapper>
  <Table>...</Table>
</ResponsiveTableWrapper>
```

### Modais/Diálogos

**Antes:**
```tsx
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
  {/* conteúdo */}
</DialogContent>
```

**Depois:**
```tsx
<DialogContent className="sm:max-w-2xl">
  <ResponsiveDialogContent size="lg">
    {/* conteúdo */}
  </ResponsiveDialogContent>
</DialogContent>
```

### Botões em Grupo

**Antes:**
```tsx
<div className="flex gap-3">
  <Button>Cancelar</Button>
  <Button>Salvar</Button>
</div>
```

**Depois:**
```tsx
<ResponsiveButtonGroup>
  <Button className="btn-responsive">Cancelar</Button>
  <Button className="btn-responsive">Salvar</Button>
</ResponsiveButtonGroup>
```

### Formulários

**Antes:**
```tsx
<div className="grid grid-cols-2 gap-4">
  <Input />
  <Input />
</div>
```

**Depois:**
```tsx
<ResponsiveGrid cols={2}>
  <Input className="text-responsive-base" />
  <Input className="text-responsive-base" />
</ResponsiveGrid>
```

## 📋 Checklist de Responsividade

### Para cada página, verifique:

- [ ] Container principal usa `ResponsiveContainer` ou `container-responsive`
- [ ] Títulos usam `ResponsiveText` ou classes `text-responsive-*`
- [ ] Grids usam `ResponsiveGrid` ou classes `grid-responsive-*`
- [ ] Cards têm `p-responsive` para padding
- [ ] Tabelas estão dentro de `ResponsiveTableWrapper`
- [ ] Modais usam `ResponsiveDialogContent`
- [ ] Botões em grupo usam `ResponsiveButtonGroup`
- [ ] Textos importantes têm tamanho mínimo legível (14px+)
- [ ] Botões têm área de toque mínima (44x44px)
- [ ] Não há scroll horizontal indesejado
- [ ] Imagens têm `max-w-full` e `h-auto`

## 🎯 Prioridades de Correção

### Alta Prioridade (Páginas mais usadas)
1. ✅ Dashboard principal
2. ✅ Tabela de clientes
3. ⚠️ Formulário de adicionar cliente
4. ⚠️ Página de WhatsApp
5. ⚠️ Métodos de pagamento

### Média Prioridade
6. ⚠️ Relatórios
7. ⚠️ Perfil
8. ⚠️ Assinatura
9. ⚠️ Planos
10. ⚠️ Despesas

### Baixa Prioridade
11. ⚠️ Páginas admin
12. ⚠️ Configurações avançadas

## 🧪 Como Testar

### 1. Chrome DevTools
```
F12 → Toggle Device Toolbar (Ctrl+Shift+M)
Testar em:
- iPhone SE (375px)
- iPhone 12 Pro (390px)
- Samsung Galaxy S20 (360px)
- iPad (768px)
```

### 2. Verificações Visuais
- [ ] Nenhum elemento cortado
- [ ] Texto legível sem zoom
- [ ] Botões fáceis de clicar
- [ ] Formulários preenchíveis
- [ ] Tabelas com scroll horizontal visível
- [ ] Modais não ultrapassam a tela

### 3. Verificações Funcionais
- [ ] Todos os botões clicáveis
- [ ] Formulários submetíveis
- [ ] Navegação funcional
- [ ] Modais abrem e fecham
- [ ] Scroll funciona corretamente

## 💡 Dicas Rápidas

### Breakpoints Tailwind
```
sm: 640px   (tablet pequeno)
md: 768px   (tablet)
lg: 1024px  (desktop pequeno)
xl: 1280px  (desktop)
2xl: 1536px (desktop grande)
```

### Mobile-First
Sempre escreva CSS mobile primeiro, depois adicione breakpoints:
```tsx
// ✅ Correto
className="text-sm sm:text-base md:text-lg"

// ❌ Errado
className="text-lg md:text-base sm:text-sm"
```

### Touch Targets
Botões e links devem ter no mínimo 44x44px:
```tsx
<button className="tap-target">
  <Icon className="h-5 w-5" />
</button>
```

### Scroll Horizontal
Sempre adicione indicador visual:
```tsx
<div className="overflow-x-auto custom-scrollbar">
  <table className="min-w-full">...</table>
</div>
```

## 🚀 Aplicação Rápida

Para aplicar rapidamente em uma página:

1. Importe os componentes:
```tsx
import {
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveTableWrapper
} from '@/components/ui/responsive-container';
```

2. Envolva o conteúdo:
```tsx
export default function Page() {
  return (
    <ResponsiveContainer>
      {/* seu conteúdo aqui */}
    </ResponsiveContainer>
  );
}
```

3. Ajuste grids e tabelas conforme necessário

4. Teste em mobile (F12 → Ctrl+Shift+M)

## 📚 Recursos Adicionais

- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Mobile-First CSS](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Responsive/Mobile_first)
- [Touch Target Sizes](https://web.dev/accessible-tap-targets/)

---

**Desenvolvido para GestPlay - Sistema 100% Responsivo** 📱✨
