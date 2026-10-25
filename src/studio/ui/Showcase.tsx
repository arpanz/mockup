import { useState } from 'react';
import { CircleHelp, Plus, Sparkles } from 'lucide-react';
import type { Paint } from '../model/types';
import {
  AlignButtons,
  Button,
  Checkbox,
  ColorField,
  ColorPicker,
  Dialog,
  EmptyState,
  Field,
  FieldStack,
  IconButton,
  Kbd,
  NumberField,
  PaintField,
  Section,
  Segmented,
  Select,
  SliderField,
  Tabs,
  TextArea,
  TextInput,
  Toggle,
  ToastProvider,
  Tooltip,
  useToast,
} from './index';

function ShowcaseContent() {
  const [number, setNumber] = useState(32);
  const [enabled, setEnabled] = useState(true);
  const [checked, setChecked] = useState(false);
  const [blend, setBlend] = useState('normal');
  const [tab, setTab] = useState('design');
  const [selection, setSelection] = useState<string | null>('phone');
  const [dialog, setDialog] = useState(false);
  const [color, setColor] = useState('#6366F1');
  const [paint, setPaint] = useState<Paint>({
    kind: 'linear',
    angle: 30,
    stops: [
      { color: '#6366F1', position: 0 },
      { color: '#A855F7', position: 0.48 },
      { color: '#EC4899', position: 1 },
    ],
  } as const);
  const toast = useToast();

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto w-80 overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-2xl">
        <div className="flex h-10 items-center border-b border-white/10 px-3 text-xs font-semibold">
          Properties <span className="ml-auto text-zinc-500">Frameflow</span>
        </div>
        <Tabs
          tabs={[{ id: 'design', label: 'Design' }, { id: 'prototype', label: 'Prototype' }]}
          value={tab}
          onChange={setTab}
        />
        <Section title="Transform" actions={<IconButton label="Help" icon={<CircleHelp size={14} />} />}>
          <Field label="Position">
            <div className="flex gap-1">
              <NumberField value={number} onChange={setNumber} icon="X" />
              <NumberField value={number} onChange={setNumber} icon="Y" />
            </div>
          </Field>
          <SliderField label="Opacity" value={number} onChange={setNumber} min={0} max={100} step={1} unit="%" defaultValue={100} />
          <Field label="Align"><AlignButtons onAlign={() => undefined} /></Field>
        </Section>
        <Section title="Appearance">
          <Field label="Blend">
            <Segmented fullWidth options={[{ value: 'normal', label: 'Normal' }, { value: 'multiply', label: 'Multiply' }]} value={blend} onChange={setBlend} />
          </Field>
          <Field label="Fill"><ColorField value={color} onChange={setColor} swatches={['#6366F1', '#EC4899', '#14B8A6']} /></Field>
          <FieldStack label="Color editor"><ColorPicker value={color} onChange={setColor} swatches={['#6366F1', '#EC4899', '#14B8A6']} /></FieldStack>
          <FieldStack label="Background"><PaintField value={paint} onChange={setPaint} /></FieldStack>
          <Field label="Visible"><Toggle checked={enabled} onChange={setEnabled} /></Field>
          <Checkbox checked={checked} onChange={setChecked} label="Clip content" />
        </Section>
        <Section title="Content">
          <TextInput defaultValue="Welcome to Frameflow" />
          <TextArea value="A carefully crafted store screenshot." onChange={() => undefined} rows={2} />
          <Select value={selection} onChange={setSelection} options={[
            { value: 'phone', label: 'iPhone 16 Pro', description: '6.3 inch' },
            { value: 'tablet', label: 'iPad Pro' },
          ]} />
        </Section>
        <Section title="Actions">
          <div className="flex gap-2">
            <Button variant="primary" icon={<Plus size={13} />} onClick={() => toast({ title: 'Added to canvas', tone: 'success' })}>Add element</Button>
            <Button onClick={() => setDialog(true)}>Open dialog</Button>
          </div>
          <Tooltip content="Keyboard shortcut" shortcut="⌘K"><Button variant="ghost">Tooltip</Button></Tooltip>
          <Kbd>⌘ Z</Kbd>
          <EmptyState icon={<Sparkles size={20} />} title="Nothing selected" description="Choose a layer to edit its properties." />
        </Section>
      </div>
      <Dialog open={dialog} onOpenChange={setDialog} title="Quick settings" description="A focused modal for secondary actions." footer={<Button variant="primary" onClick={() => setDialog(false)}>Done</Button>}>
        <TextInput placeholder="Name this design" />
      </Dialog>
    </main>
  );
}

export default function Showcase() {
  return <ToastProvider><ShowcaseContent /></ToastProvider>;
}
