import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { cn } from '@/lib/utils';
import TopAppBar from './top-app-bar';

export interface PageShellConfig {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  searchSlot?: ReactNode;
  primaryActions?: ReactNode;
  secondaryActions?: ReactNode;
  utilityActions?: ReactNode;
  floatingActionButton?: ReactNode;
}

const EMPTY_PAGE_SHELL_CONFIG: PageShellConfig = {};

const PAGE_SHELL_CONFIG_KEYS: Array<keyof PageShellConfig> = [
  'eyebrow',
  'title',
  'subtitle',
  'searchSlot',
  'primaryActions',
  'secondaryActions',
  'utilityActions',
  'floatingActionButton',
];

const PageShellContext = createContext<Dispatch<SetStateAction<PageShellConfig>> | null>(null);

export function arePageShellConfigsEqual(a: PageShellConfig, b: PageShellConfig) {
  return PAGE_SHELL_CONFIG_KEYS.every((key) => a[key] === b[key]);
}

export function PageShellProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: Dispatch<SetStateAction<PageShellConfig>>;
}) {
  return <PageShellContext.Provider value={value}>{children}</PageShellContext.Provider>;
}

export function usePageShell(config: PageShellConfig) {
  const setPageShell = useContext(PageShellContext);
  const latestConfigRef = useRef(config);

  latestConfigRef.current = config;

  useEffect(() => {
    if (!setPageShell) {
      return;
    }

    setPageShell((previous) =>
      arePageShellConfigsEqual(previous, latestConfigRef.current) ? previous : latestConfigRef.current
    );
  }, [config, setPageShell]);

  useEffect(() => {
    if (!setPageShell) {
      return;
    }

    return () => {
      setPageShell((previous) =>
        arePageShellConfigsEqual(previous, latestConfigRef.current) ? EMPTY_PAGE_SHELL_CONFIG : previous
      );
    };
  }, [setPageShell]);
}

export default function PageShell({
  children,
  eyebrow,
  title,
  subtitle,
  searchSlot,
  primaryActions,
  secondaryActions,
  utilityActions,
  floatingActionButton,
  onOpenSidebar,
}: PageShellConfig & {
  children: ReactNode;
  onOpenSidebar: () => void;
}) {
  return (
    <div className="shell-canvas relative min-h-screen">
      <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(98,138,219,0.13),_transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.62),rgba(244,238,228,0))] pointer-events-none" />
      <TopAppBar
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        searchSlot={searchSlot}
        primaryActions={primaryActions}
        secondaryActions={secondaryActions}
        utilityActions={utilityActions}
        onOpenSidebar={onOpenSidebar}
      />
      <section className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className={cn('flex-1')}>{children}</div>
      </section>
      {floatingActionButton}
    </div>
  );
}
