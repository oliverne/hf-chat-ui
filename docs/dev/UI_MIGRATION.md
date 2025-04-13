# Chat UI: shadcn-svelte 마이그레이션 가이드

이 문서는 Chat UI 프로젝트의 UI를 shadcn-svelte로 마이그레이션하는 방법에 대한 가이드를 제공합니다.

## 현재 UI 상태

Chat UI는 현재 다음 기술을 사용하고 있습니다:

- **프레임워크**: Svelte 5 / SvelteKit 2
- **스타일링**: Tailwind CSS 3.4.0
- **컴포넌트**: 자체 개발한 컴포넌트 (Modal, Switch, Button 등)
- **아이콘**: unplugin-icons (Carbon, EOS 아이콘 등)
- **플러그인**: tailwind-scrollbar, @tailwindcss/typography

## 마이그레이션 준비

### 1. shadcn-svelte 설치 및 초기화

```bash
# shadcn-svelte CLI 설치
npm install -D shadcn-svelte

# 초기화 (Svelte 5 호환성 경고가 있을 수 있음)
npx shadcn-svelte init
```

초기화 과정에서 다음 질문에 답해야 합니다:

- **Style**: Default (Tailwind CSS를 사용하고 있으므로)
- **Base color**: 기존 앱 색상과 일치하도록 선택 (blue 또는 현재 사용 중인 색상)
- **글로벌 CSS 파일 경로**: src/styles/main.css
- **컴포넌트 디렉토리**: src/lib/shadcn (또는 src/lib/components/ui)

### 2. tailwind.config.cjs 업데이트

기존 tailwind.config.cjs 파일에 shadcn 설정을 통합합니다:

```js
const { fontFamily } = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        primary: colors[process.env.PUBLIC_APP_COLOR],
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        // shadcn 색상 변수들 추가
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans],
      },
      fontSize: {
        xxs: "0.625rem",
        smd: "0.94rem",
      },
    },
  },
  plugins: [
    require("tailwind-scrollbar")({ nocompatible: true }),
    require("@tailwindcss/typography"),
  ],
};
```

## 컴포넌트 마이그레이션

### 1. 기본 컴포넌트 설치

프로젝트에 필요한 기본 shadcn 컴포넌트를 설치합니다:

```bash
# 기본 컴포넌트
npx shadcn-svelte add button
npx shadcn-svelte add modal
npx shadcn-svelte add dialog
npx shadcn-svelte add switch
npx shadcn-svelte add input
npx shadcn-svelte add textarea
npx shadcn-svelte add avatar
npx shadcn-svelte add dropdown-menu
npx shadcn-svelte add tooltip

# 필요에 따라 추가 컴포넌트 설치
npx shadcn-svelte add tabs
npx shadcn-svelte add select
npx shadcn-svelte add toggle
```

### 2. 단계별 마이그레이션 전략

UI 컴포넌트 마이그레이션은 다음 순서로 진행하는 것이 좋습니다:

1. **기본 컴포넌트** (Button, Switch, Modal 등)
2. **폼 컴포넌트** (Input, Textarea 등)
3. **탐색 컴포넌트** (Tabs, Pagination 등)
4. **복잡한 컴포넌트** (채팅 인터페이스, 마크다운 렌더러 등)

### 3. 컴포넌트 마이그레이션 예시

#### Modal → Dialog 컴포넌트 마이그레이션

기존 Modal 컴포넌트:

```svelte
<!-- src/lib/components/Modal.svelte -->
<Portal>
  <div
    role="presentation"
    tabindex="-1"
    bind:this={backdropEl}
    onclick={(e) => {
      e.stopPropagation();
      handleBackdropClick(e);
    }}
    transition:fade|local={{ easing: cubicOut, duration: 300 }}
    class="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm dark:bg-black/50"
  >
    <div
      role="dialog"
      tabindex="-1"
      bind:this={modalEl}
      onkeydown={handleKeydown}
      in:fly={{ y: 100 }}
      class={[
        "relative mx-auto max-h-[95dvh] max-w-[90dvw] overflow-y-auto overflow-x-hidden rounded-2xl bg-white shadow-2xl outline-none",
        width,
      ]}
    >
      {#if closeButton}
        <button class="absolute right-4 top-4 z-50" onclick={() => dispatch("close")}>
          <CarbonClose class="size-6 text-gray-700" />
        </button>
      {/if}
      {@render children?.()}
    </div>
  </div>
</Portal>
```

shadcn-svelte Dialog 사용 예시:

```svelte
<script lang="ts">
  import * as Dialog from "$lib/shadcn/ui/dialog";
  
  let open = $state(false);
  
  function handleClose() {
    open = false;
    dispatch("close");
  }
</script>

<Dialog.Root bind:open onOpenChange={handleClose}>
  <Dialog.Content class={width}>
    {#if closeButton}
      <Dialog.Close class="absolute right-4 top-4 z-50">
        <CarbonClose class="size-6 text-gray-700" />
      </Dialog.Close>
    {/if}
    {@render children?.()}
  </Dialog.Content>
</Dialog.Root>
```

## 주요 마이그레이션 대상 컴포넌트

프로젝트의 주요 마이그레이션 대상 컴포넌트는 다음과 같습니다:

| 기존 컴포넌트 | shadcn 대체 컴포넌트 | 
|---------------|-----------------------|
| Modal.svelte | Dialog |
| Switch.svelte | Switch |
| RetryBtn, StopGeneratingBtn, 등 | Button |
| ChatInput.svelte | Textarea + Button |
| MarkdownRenderer.svelte | 커스텀 구현 필요 |
| NavConversationItem.svelte | 커스텀 구현 필요 |
| Tooltip.svelte | Tooltip |
| Pagination.svelte | Pagination |

## Svelte 5 호환성 고려사항

shadcn-svelte는 Svelte 4에 최적화되어 있으므로, Svelte 5와 함께 사용할 때 다음 사항을 고려해야 합니다:

1. **$props, $state, $derived**: shadcn 컴포넌트를 수정하여 Svelte 5 문법과 호환되도록 해야 할 수 있습니다.

2. **이벤트 처리**: Svelte 5의 이벤트 처리 방식과 shadcn 컴포넌트의 이벤트 처리 방식을 통합해야 합니다.

3. **타입 정의**: Svelte 5의 타입 시스템과 shadcn 컴포넌트의 타입 정의를 조정해야 할 수 있습니다.

## 아이콘 마이그레이션

현재 프로젝트는 unplugin-icons를 사용하고 있지만, shadcn-svelte는 lucide-svelte를 권장합니다:

```bash
# lucide-svelte 설치
npm install lucide-svelte
```

아이콘 사용 예시 변경:

```svelte
<!-- 기존 unplugin-icons 사용 방식 -->
<script>
  import CarbonClose from "~icons/carbon/close";
</script>
<CarbonClose class="size-6" />

<!-- lucide-svelte 사용 방식 -->
<script>
  import { X } from "lucide-svelte";
</script>
<X class="size-6" />
```

## 테마 통합

shadcn-svelte는 CSS 변수를 사용한 테마 시스템을 사용합니다. 기존 앱 색상과 통합하기 위해 src/styles/main.css 파일에 다음과 같은 설정을 추가합니다:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    /* PRIMARY 색상을 앱 기본 색상(PUBLIC_APP_COLOR)과 맞추기 */
    --primary: 217.2 91.2% 59.8%; /* blue-500 */
    --primary-foreground: 210 40% 98%;

    /* 나머지 색상 변수들 */
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.75rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;

    /* PRIMARY 색상을 앱 기본 색상(PUBLIC_APP_COLOR)과 맞추기 */
    --primary: 217.2 91.2% 59.8%; /* blue-500 */
    --primary-foreground: 210 40% 98%;

    /* 나머지 색상 변수들 */
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}
```

## 점진적 마이그레이션 접근법

전체 UI를 한 번에 마이그레이션하는 것은 어려울 수 있으므로, 다음과 같은 점진적 접근법을 권장합니다:

1. **병렬 구현**: 새로운 디렉토리(src/lib/shadcn)에 shadcn 컴포넌트를 설치하고, 기존 컴포넌트와 병렬로 유지합니다.

2. **컴포넌트별 전환**: 한 번에 하나의 컴포넌트씩 기존 구현에서 shadcn 구현으로 전환합니다.

3. **페이지별 테스트**: 각 페이지에서 새 컴포넌트를 테스트하여 기능과 스타일이 올바르게 작동하는지 확인합니다.

4. **공통 UI 먼저**: 가장 일반적으로 사용되는 컴포넌트(버튼, 모달 등)부터 마이그레이션합니다.

5. **복잡한 컴포넌트 나중에**: 채팅 인터페이스와 같은 복잡한 컴포넌트는 마지막에 마이그레이션합니다.

## 팁과 주의사항

- **UI 테스트 계획**: 각 컴포넌트 마이그레이션 후 테스트 계획을 세웁니다.
- **스타일 일관성**: shadcn과 기존 Tailwind 스타일 간의 일관성을 유지합니다.
- **접근성**: shadcn 컴포넌트는 접근성이 향상된 기능을 제공하므로, 이를 최대한 활용합니다.
- **다크 모드**: 기존 다크 모드 지원이 shadcn 컴포넌트에서도 작동하는지 확인합니다.
- **Svelte 5 호환성**: Svelte 5의 새로운 기능과 shadcn 컴포넌트의 호환성을 확인합니다.

## 결론

shadcn-svelte로의 마이그레이션은 상당한 작업이 필요하지만, 일관된 디자인 시스템과 접근성이 향상된 UI 컴포넌트를 통해 장기적인 이점을 제공합니다. 점진적인 접근법을 통해 위험을 최소화하면서 프로젝트를 향상시킬 수 있습니다.