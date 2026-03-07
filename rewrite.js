const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Update Screenshot type
code = code.replace(
    /type Screenshot = \{[\s\S]*?deviceOffset: Point;\n\s*\};/,
    `type Screenshot = {
  id: string;
  url: string;
  title: string;
  subtitle: string;
  textOffset: Point;
  deviceOffset: Point;
  settingsOverrides?: Partial<Settings>;
};`
);

// 2. Add applyToAll state
code = code.replace(
    /const \[activeIndex, setActiveIndex\] = useState\(0\);/,
    `const [activeIndex, setActiveIndex] = useState(0);
  const [applyToAll, setApplyToAll] = useState(true);`
);

// 3. Add activeSettings and updateSetting logic
code = code.replace(
    /const containerRef = useRef<HTMLDivElement>\(null\);/,
    `const activeSettings = screenshots[activeIndex] ? { ...settings, ...screenshots[activeIndex].settingsOverrides } : settings;

  const updateSetting = (updates: Partial<Settings>) => {
    if (applyToAll) {
      setSettings((s) => ({ ...s, ...updates }));
      setScreenshots((prev) => prev.map(s => {
        if (!s.settingsOverrides) return s;
        const newOverrides = { ...s.settingsOverrides };
        Object.keys(updates).forEach(k => delete newOverrides[k as keyof Settings]);
        return { ...s, settingsOverrides: newOverrides };
      }));
    } else {
      setScreenshots((prev) => prev.map((s, i) => {
        if (i !== activeIndex) return s;
        return {
          ...s,
          settingsOverrides: { ...s.settingsOverrides, ...updates }
        };
      }));
    }
  };

  const containerRef = useRef<HTMLDivElement>(null);`
);

// 4. Update export mapping
code = code.replace(
    /settings=\{settings\}/g,
    `settings={{ ...settings, ...screenshot.settingsOverrides }}`
);

// 5. Update preview mapping
code = code.replace(
    /<MockupTemplate screenshot=\{screenshots\[activeIndex\]\} settings=\{settings\}/,
    `<MockupTemplate screenshot={screenshots[activeIndex]} settings={activeSettings}`
);

// 6. Fix duplicate logic to include settingsOverrides
code = code.replace(
    /textOffset: \{ \.\.\.active\.textOffset \},\n\s*deviceOffset: \{ \.\.\.active\.deviceOffset \}/,
    `textOffset: { ...active.textOffset },
      deviceOffset: { ...active.deviceOffset },
      settingsOverrides: active.settingsOverrides ? { ...active.settingsOverrides } : undefined`
);

// 7. Inject Apply to All toggle in the sidebar
code = code.replace(
    /<h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Global Settings<\/h2>/,
    `<div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Global Settings</h2>
              <label className="flex items-center gap-2 cursor-pointer" title="Apply settings to all slides or only current slide">
                <span className="text-xs font-semibold text-gray-500">Apply to All</span>
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={applyToAll} onChange={(e) => setApplyToAll(e.target.checked)} />
                  <div className={\`block w-8 h-4 rounded-full transition-colors \${applyToAll ? 'bg-indigo-600' : 'bg-gray-300'}\`}></div>
                  <div className={\`absolute left-1 top-1 bg-white w-2 h-2 rounded-full transition-transform \${applyToAll ? 'translate-x-4' : ''}\`}></div>
                </div>
              </label>
            </div>`
);

// 8. Replace settings mapping inside the sidebar ONLY
// Find the sidebar block:
const sidebarStartRegex = /<div className=\"w-80 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0\">/;
const sidebarEndRegex = /<div className=\"flex-1 flex flex-col overflow-hidden relative\">/;
const matchStart = code.match(sidebarStartRegex);
const matchEnd = code.match(sidebarEndRegex);

if (matchStart && matchEnd) {
    let sidebarCode = code.substring(matchStart.index, matchEnd.index);
    // Replace setSettings((s) => ({ ...s, KEY: e.target.value }))
    sidebarCode = sidebarCode.replace(/setSettings\(\(s\) => \(\{ \.\.\.s, (.*?): (.*?) \}\)\)/g, 'updateSetting({ $1: $2 })');

    // Replace settings.KEY with activeSettings.KEY inside the sidebar
    sidebarCode = sidebarCode.replace(/settings\./g, 'activeSettings.');

    code = code.substring(0, matchStart.index) + sidebarCode + code.substring(matchEnd.index);
}

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx transformed successfully!');
