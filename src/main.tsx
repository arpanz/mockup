import {StrictMode, Suspense, lazy} from 'react';
import {createRoot} from 'react-dom/client';
import {StudioApp} from './studio/StudioApp';
import './index.css';

// Dev QA pages and the legacy v1 editor load on demand so they never weigh down the studio bundle.
const LegacyApp = lazy(() => import('./App.tsx'));
const QaPage = lazy(() => import('./studio/qa').then((module) => ({
  default: ({page}: {page: string}) => <module.QaRouter page={page} />,
})));

const page = window.location.hash.slice(1);

function Root() {
  if (page.startsWith('qa-')) return <Suspense fallback={null}><QaPage page={page} /></Suspense>;
  // The v1 editor stays reachable at #v1 until it is removed.
  if (page === 'v1') return <Suspense fallback={null}><LegacyApp /></Suspense>;
  return <StudioApp />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
