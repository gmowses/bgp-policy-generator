import { useState, useEffect } from 'react'
import { Sun, Moon, Languages, Settings, Copy, CheckCircle2, Plus, Trash2 } from 'lucide-react'

const translations = {
  en: {
    title: 'BGP Policy Generator',
    subtitle: 'Generate route-map and route-policy configurations for multiple vendors. Configure match conditions and set actions.',
    policyName: 'Policy Name',
    action: 'Default Action',
    permit: 'Permit',
    deny: 'Deny',
    seq: 'Sequence Number',
    matchConditions: 'Match Conditions',
    addMatch: 'Add Match',
    setActions: 'Set Actions',
    addSet: 'Add Set',
    matchTypes: {
      prefixList: 'Prefix-list',
      community: 'Community',
      aspath: 'AS-path access-list',
      localPref: 'Local-pref',
      med: 'MED',
      peerType: 'Peer type',
    },
    setTypes: {
      localPref: 'Set local-pref',
      community: 'Set community',
      addCommunity: 'Add community',
      prepend: 'AS-path prepend',
      nextHop: 'Set next-hop',
      med: 'Set MED',
    },
    value: 'Value',
    generate: 'Generate',
    output: 'Vendor Output',
    copy: 'Copy',
    copied: 'Copied!',
    builtBy: 'Built by',
    references: 'References',
    refList: [
      'RFC 1997 – BGP Communities Attribute',
      'RFC 4271 – BGP-4',
      'RFC 7153 – IANA Registries for BGP Extended Communities',
    ],
  },
  pt: {
    title: 'Gerador de Politica BGP',
    subtitle: 'Gere configuracoes de route-map e route-policy para multiplos fornecedores. Configure condicoes de correspondencia e acoes.',
    policyName: 'Nome da Politica',
    action: 'Acao Padrao',
    permit: 'Permitir',
    deny: 'Negar',
    seq: 'Numero de Sequencia',
    matchConditions: 'Condicoes de Correspondencia',
    addMatch: 'Adicionar Correspondencia',
    setActions: 'Acoes',
    addSet: 'Adicionar Acao',
    matchTypes: {
      prefixList: 'Prefix-list',
      community: 'Community',
      aspath: 'AS-path access-list',
      localPref: 'Local-pref',
      med: 'MED',
      peerType: 'Tipo de par',
    },
    setTypes: {
      localPref: 'Definir local-pref',
      community: 'Definir community',
      addCommunity: 'Adicionar community',
      prepend: 'AS-path prepend',
      nextHop: 'Definir next-hop',
      med: 'Definir MED',
    },
    value: 'Valor',
    generate: 'Gerar',
    output: 'Saida por Fornecedor',
    copy: 'Copiar',
    copied: 'Copiado!',
    builtBy: 'Criado por',
    references: 'Referencias',
    refList: [
      'RFC 1997 – BGP Communities Attribute',
      'RFC 4271 – BGP-4',
      'RFC 7153 – IANA Registries for BGP Extended Communities',
    ],
  },
} as const

type Lang = keyof typeof translations
type MatchType = keyof typeof translations.en.matchTypes
type SetType = keyof typeof translations.en.setTypes

interface MatchEntry { id: number; type: MatchType; value: string }
interface SetEntry { id: number; type: SetType; value: string }

let mid = 1
let sid = 1

function generateCisco(name: string, seq: number, action: string, matches: MatchEntry[], sets: SetEntry[]): string {
  const lines: string[] = [`route-map ${name} ${action} ${seq}`]
  for (const m of matches) {
    if (m.type === 'prefixList') lines.push(` match ip address prefix-list ${m.value}`)
    else if (m.type === 'community') lines.push(` match community ${m.value}`)
    else if (m.type === 'aspath') lines.push(` match as-path ${m.value}`)
    else if (m.type === 'localPref') lines.push(` match local-preference ${m.value}`)
    else if (m.type === 'med') lines.push(` match metric ${m.value}`)
    else if (m.type === 'peerType') lines.push(` match peer ${m.value}`)
  }
  for (const s of sets) {
    if (s.type === 'localPref') lines.push(` set local-preference ${s.value}`)
    else if (s.type === 'community') lines.push(` set community ${s.value}`)
    else if (s.type === 'addCommunity') lines.push(` set community ${s.value} additive`)
    else if (s.type === 'prepend') lines.push(` set as-path prepend ${s.value}`)
    else if (s.type === 'nextHop') lines.push(` set ip next-hop ${s.value}`)
    else if (s.type === 'med') lines.push(` set metric ${s.value}`)
  }
  return lines.join('\n')
}

function generateJuniper(name: string, action: string, matches: MatchEntry[], sets: SetEntry[]): string {
  const matchLines: string[] = []
  const setLines: string[] = []
  for (const m of matches) {
    if (m.type === 'prefixList') matchLines.push(`        prefix-list ${m.value};`)
    else if (m.type === 'community') matchLines.push(`        community ${m.value};`)
    else if (m.type === 'aspath') matchLines.push(`        as-path ${m.value};`)
    else if (m.type === 'localPref') matchLines.push(`        local-preference ${m.value};`)
    else if (m.type === 'med') matchLines.push(`        metric ${m.value};`)
  }
  for (const s of sets) {
    if (s.type === 'localPref') setLines.push(`        local-preference ${s.value};`)
    else if (s.type === 'community') setLines.push(`        community set ${s.value};`)
    else if (s.type === 'addCommunity') setLines.push(`        community add ${s.value};`)
    else if (s.type === 'prepend') setLines.push(`        as-path-prepend "${s.value}";`)
    else if (s.type === 'nextHop') setLines.push(`        next-hop ${s.value};`)
    else if (s.type === 'med') setLines.push(`        metric ${s.value};`)
  }
  const jAction = action === 'permit' ? 'accept' : 'reject'
  return `policy-options {
    policy-statement ${name} {
        term T1 {
            from {
${matchLines.join('\n')}
            }
            then {
${setLines.join('\n')}
                ${jAction};
            }
        }
    }
}`
}

function generateHuawei(name: string, seq: number, action: string, matches: MatchEntry[], sets: SetEntry[]): string {
  const lines: string[] = [`route-policy ${name} ${action === 'permit' ? 'permit' : 'deny'} node ${seq}`]
  for (const m of matches) {
    if (m.type === 'prefixList') lines.push(` if-match ip-prefix ${m.value}`)
    else if (m.type === 'community') lines.push(` if-match community-filter ${m.value}`)
    else if (m.type === 'aspath') lines.push(` if-match as-path-filter ${m.value}`)
    else if (m.type === 'localPref') lines.push(` if-match local-preference ${m.value}`)
    else if (m.type === 'med') lines.push(` if-match cost ${m.value}`)
  }
  for (const s of sets) {
    if (s.type === 'localPref') lines.push(` apply local-preference ${s.value}`)
    else if (s.type === 'community') lines.push(` apply community ${s.value}`)
    else if (s.type === 'addCommunity') lines.push(` apply community ${s.value} additive`)
    else if (s.type === 'prepend') lines.push(` apply as-path ${s.value} additive`)
    else if (s.type === 'nextHop') lines.push(` apply ip-address next-hop ${s.value}`)
    else if (s.type === 'med') lines.push(` apply cost ${s.value}`)
  }
  return lines.join('\n')
}

export default function BgpPolicyGenerator() {
  const [lang, setLang] = useState<Lang>(() => (navigator.language.startsWith('pt') ? 'pt' : 'en'))
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [name, setName] = useState('POLICY-IN')
  const [seq, setSeq] = useState(10)
  const [action, setAction] = useState<'permit' | 'deny'>('permit')
  const [matches, setMatches] = useState<MatchEntry[]>([{ id: mid++, type: 'prefixList', value: 'PL-CUSTOMERS' }])
  const [sets, setSets] = useState<SetEntry[]>([{ id: sid++, type: 'localPref', value: '200' }])
  const [generated, setGenerated] = useState(false)
  const [copiedKey, setCopiedKey] = useState('')

  const t = translations[lang]
  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopiedKey(key); setTimeout(() => setCopiedKey(''), 2000) })
  }

  const cisco = generateCisco(name, seq, action, matches, sets)
  const juniper = generateJuniper(name, action, matches, sets)
  const huawei = generateHuawei(name, seq, action, matches, sets)

  const inputCls = 'rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500'
  const selectCls = inputCls

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <Settings size={18} className="text-white" />
            </div>
            <span className="font-semibold">BGP Policy Generator</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Languages size={14} />{lang.toUpperCase()}
            </button>
            <button onClick={() => setDark(d => !d)} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a href="https://github.com/gmowses/bgp-policy-generator" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-6">
            {/* Basic config */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">{t.policyName}</label>
                <input value={name} onChange={e => setName(e.target.value)} className={`${inputCls} w-full`} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">{t.seq}</label>
                <input type="number" value={seq} onChange={e => setSeq(Number(e.target.value))} className={`${inputCls} w-full`} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">{t.action}</label>
                <select value={action} onChange={e => setAction(e.target.value as 'permit' | 'deny')} className={`${selectCls} w-full`}>
                  <option value="permit">{t.permit}</option>
                  <option value="deny">{t.deny}</option>
                </select>
              </div>
            </div>

            {/* Match conditions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t.matchConditions}</h3>
                <button onClick={() => setMatches(m => [...m, { id: mid++, type: 'prefixList', value: '' }])}
                  className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 transition-colors">
                  <Plus size={12} />{t.addMatch}
                </button>
              </div>
              {matches.map(m => (
                <div key={m.id} className="flex gap-2 items-start">
                  <select value={m.type} onChange={e => setMatches(ms => ms.map(x => x.id === m.id ? { ...x, type: e.target.value as MatchType } : x))}
                    className={`${selectCls} shrink-0`}>
                    {(Object.keys(t.matchTypes) as MatchType[]).map(k => <option key={k} value={k}>{t.matchTypes[k]}</option>)}
                  </select>
                  <input value={m.value} onChange={e => setMatches(ms => ms.map(x => x.id === m.id ? { ...x, value: e.target.value } : x))}
                    placeholder={t.value} className={`${inputCls} flex-1`} />
                  <button onClick={() => setMatches(ms => ms.filter(x => x.id !== m.id))} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Set actions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t.setActions}</h3>
                <button onClick={() => setSets(s => [...s, { id: sid++, type: 'localPref', value: '' }])}
                  className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 transition-colors">
                  <Plus size={12} />{t.addSet}
                </button>
              </div>
              {sets.map(s => (
                <div key={s.id} className="flex gap-2 items-start">
                  <select value={s.type} onChange={e => setSets(ss => ss.map(x => x.id === s.id ? { ...x, type: e.target.value as SetType } : x))}
                    className={`${selectCls} shrink-0`}>
                    {(Object.keys(t.setTypes) as SetType[]).map(k => <option key={k} value={k}>{t.setTypes[k]}</option>)}
                  </select>
                  <input value={s.value} onChange={e => setSets(ss => ss.map(x => x.id === s.id ? { ...x, value: e.target.value } : x))}
                    placeholder={t.value} className={`${inputCls} flex-1`} />
                  <button onClick={() => setSets(ss => ss.filter(x => x.id !== s.id))} className="p-2 text-zinc-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button onClick={() => setGenerated(true)} className="flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-600 transition-colors">
              <Settings size={15} />{t.generate}
            </button>
          </div>

          {generated && (
            <div className="space-y-4">
              <h2 className="font-semibold">{t.output}</h2>
              {([
                { key: 'cisco', label: 'Cisco IOS/IOS-XE', color: '#3b82f6', code: cisco },
                { key: 'juniper', label: 'Juniper JunOS', color: '#ef4444', code: juniper },
                { key: 'huawei', label: 'Huawei VRP', color: '#10b981', code: huawei },
              ] as const).map(v => (
                <div key={v.key} className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800">
                    <span className="text-xs font-semibold" style={{ color: v.color }}>{v.label}</span>
                    <button onClick={() => copy(v.code, v.key)} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-amber-500 transition-colors">
                      {copiedKey === v.key ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} />}
                      {copiedKey === v.key ? t.copied : t.copy}
                    </button>
                  </div>
                  <pre className="px-4 py-4 text-xs font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap bg-zinc-950 dark:bg-black leading-relaxed">{v.code}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-6">
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>{t.builtBy} <a href="https://github.com/gmowses" className="text-zinc-600 dark:text-zinc-300 hover:text-amber-500 transition-colors">Gabriel Mowses</a></span>
            <span>MIT License</span>
          </div>
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
            <p className="text-xs font-medium text-zinc-500 mb-1">{t.references}</p>
            <ul className="space-y-0.5">
              {t.refList.map(ref => <li key={ref} className="text-xs text-zinc-400">{ref}</li>)}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  )
}
