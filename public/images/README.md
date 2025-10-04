# Instruções para Adicionar a Logo do GestPlay

## Passo a Passo:

1. **Baixe a imagem** do link: https://imgur.com/a/ZvQlIOm

2. **Salve a imagem** nesta pasta (`public/images/`) com o nome: `gestplay-logo.png`

3. **Formato recomendado**: 
   - PNG com fundo transparente (OBRIGATÓRIO para melhor resultado)
   - Tamanho: 80x80 pixels ou maior (será redimensionada para 80x80)
   - A logo aparecerá PURA, sem fundo decorativo

4. **Após adicionar a imagem**, ela aparecerá automaticamente no sidebar

## Características:
- ✅ Logo pura (sem fundo azul-roxo)
- ✅ Sem ícone de estrela
- ✅ Tamanho maior (80x80 pixels)
- ✅ Espaçamento reduzido entre logo e título
- ✅ Fundo transparente recomendado

## Fallback:
Se a imagem não carregar, o sistema voltará ao ícone de TV original (oculto).

## Localização no código:
A logo está configurada em: `src/components/layout/sidebar-layout.tsx`