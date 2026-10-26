import {StrictMode, Suspense, lazy} from 'react';
import {createRoot} from 'react-dom/client';
import {StudioApp} from './studio/StudioApp';
import './index.css';

// Dev QA pages load on demand so they never weigh down the studio bundle.
const QaPage = lazy(() => import('./studio/qa').then((module) => ({
  default: ({page}: {page: string}) => <module.QaRouter page={page} />,
})));

const page = window.location.hash.slice(1);

// The headless page `npm run mockups` drives (see MOCKUPS.md): no editor UI, no autosave.
if (page === 'agent') void import('./studio/agent/agentPage');

function Root() {
  if (page.startsWith('qa-')) return <Suspense fallback={null}><QaPage page={page} /></Suspense>;
  if (page === 'agent') return null;
  return <StudioApp />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
