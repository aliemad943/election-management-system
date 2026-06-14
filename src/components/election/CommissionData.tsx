'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Landmark, Plus, Edit2, Trash2, Save, X, ChevronDown, Search,
  Users, BarChart3, TrendingUp, Activity, AlertTriangle, MapPin,
  CheckCircle, XCircle, Building2, Vote, Eye, RefreshCw
} from 'lucide-react';

const DISTRICTS = [
  'الناصرية', 'الشطرة', 'سوق الشيوخ', 'الرفاعي', 'الجبايش', 'قلعة سكر',
  'الغراف', 'النصر', 'الفجر', 'الفهود', 'البطحاء', 'سيد دخيل',
  'الإصلاح', 'الدواية', 'الفضلية', 'العكيكة', 'الطار', 'كرمة بني سعيد',
  'أور', 'المنار', 'الحمار'
];

const TABS = [
  { id: 'pre-election', label: 'البيانات الأساسية للناخبين', icon: Users, color: 'text-blue-600' },
  { id: 'results', label: 'النتائج الانتخابية', icon: Vote, color: 'text-emerald-600' },
  { id: 'analysis', label: 'التحليل الانتخابي', icon: BarChart3, color: 'text-violet-600' },
  { id: 'variable', label: 'البيانات المتغيرة', icon: TrendingUp, color: 'text-amber-600' },
  { id: 'early-warning', label: 'مؤشرات الإنذار المبكر', icon: AlertTriangle, color: 'text-red-600' },
];

const MOOD_OPTIONS = ['إيجابي', 'سلبي', 'محايد', 'متذبذب'];

interface CommissionRecord {
  id: string;
  province: string;
  district: string;
  subDistrict: string;
  pollingCenter: string;
  ballotStation: string;
  registeredVoters: number;
  historicalTurnout: number;
  expectedTurnout: number | null;
  // Pre-election
  provinceRegistered: number | null;
  districtRegistered: number | null;
  subDistrictRegistered: number | null;
  actualTurnout: number | null;
  ageDistribution: any;
  genderMale: number | null;
  genderFemale: number | null;
  educationDistribution: any;
  provinceCenters: number | null;
  districtCenters: number | null;
  subDistrictCenters: number | null;
  provinceStations: number | null;
  districtStations: number | null;
  subDistrictStations: number | null;
  votersPerCenter: number | null;
  registryUpdateRate: number | null;
  newVotersCount: number | null;
  urbanRuralRatio: any;
  // Results
  votesPerParty: any;
  percentagePerParty: any;
  votesPerCandidate: any;
  percentagePerCandidate: any;
  resultsByCenter: any;
  seatsPerParty: any;
  expectedTurnoutRate: number | null;
  resultsGeographic: any;
  candidateRanking: any;
  candidateWinRateByCenter: any;
  // Analysis
  previousResults: any;
  turnoutChange: number | null;
  partyStrengthChange: any;
  regionContribution: number | null;
  regionRankByStrength: number | null;
  // Variable
  popularMood: string | null;
  hotIssues: any;
  opinionTrends: any;
  satisfactionRate: number | null;
  opponentStrength: any;
  influentialEvents: any;
  digitalTrend: any;
  // Early warning
  threatenedRegions: any;
  penetrableRegions: any;
  safeRegions: any;
  swingRegions: any;
  lowTurnoutRegions: any;
  highCompetitionRegions: any;
  createdAt: string;
}

const emptyForm: any = {
  province: 'ذي قار', district: 'الناصرية', subDistrict: '', pollingCenter: '', ballotStation: '1',
  registeredVoters: '', historicalTurnout: '', expectedTurnout: '',
  provinceRegistered: '', districtRegistered: '', subDistrictRegistered: '', actualTurnout: '',
  genderMale: '', genderFemale: '',
  provinceCenters: '', districtCenters: '', subDistrictCenters: '',
  provinceStations: '', districtStations: '', subDistrictStations: '',
  votersPerCenter: '', registryUpdateRate: '', newVotersCount: '',
  ageDistribution: '', educationDistribution: '', urbanRuralRatio: '',
  votesPerParty: '', percentagePerParty: '', votesPerCandidate: '', percentagePerCandidate: '',
  resultsByCenter: '', seatsPerParty: '', expectedTurnoutRate: '', resultsGeographic: '',
  candidateRanking: '', candidateWinRateByCenter: '',
  previousResults: '', turnoutChange: '', partyStrengthChange: '', regionContribution: '', regionRankByStrength: '',
  popularMood: '', hotIssues: '', opinionTrends: '', satisfactionRate: '',
  opponentStrength: '', influentialEvents: '', digitalTrend: '',
  threatenedRegions: '', penetrableRegions: '', safeRegions: '',
  swingRegions: '', lowTurnoutRegions: '', highCompetitionRegions: '',
};

// Helper: format JSON for display
function displayJson(val: any): string {
  if (!val) return '—';
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val, null, 2); } catch { return String(val); }
}

// Helper: format JSON for editing
function jsonToEditStr(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val); } catch { return ''; }
}

// Input field component
function Field({ label, children, span = 1 }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <label className="block text-[10px] font-bold text-el-on-surface-variant mb-1">{label}</label>
      {children}
    </div>
  );
}

function NumInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input type="number" className="w-full bg-el-surface border border-el-outline-variant rounded h-8 px-2 text-[12px] focus:outline-none focus:border-el-primary font-mono"
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input className="w-full bg-el-surface border border-el-outline-variant rounded h-8 px-2 text-[12px] focus:outline-none focus:border-el-primary"
      value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea className="w-full bg-el-surface border border-el-outline-variant rounded p-2 text-[11px] focus:outline-none focus:border-el-primary resize-none font-mono"
      rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
  );
}

// Stat card for summary
function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-el-surface-container-lowest border border-el-outline-variant/50 rounded-lg p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-all">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color} bg-opacity-10`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] text-el-on-surface-variant font-medium">{label}</p>
        <p className="text-[16px] font-bold text-el-on-surface font-mono">{value}</p>
      </div>
    </div>
  );
}


export default function CommissionData() {
  const [records, setRecords] = useState<CommissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [activeTab, setActiveTab] = useState('pre-election');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<CommissionRecord | null>(null);
  const [detailTab, setDetailTab] = useState('pre-election');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterDistrict) params.set('district', filterDistrict);
      const res = await fetch(`/api/commission-data?${params.toString()}`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [filterDistrict]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const setF = (key: string, val: any) => setForm((p: any) => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const url = '/api/commission-data';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit ? { ...form, id: editId } : { ...form };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        setMsg({ type: 'success', text: isEdit ? 'تم تحديث السجل بنجاح' : 'تم إضافة السجل بنجاح' });
        setForm({ ...emptyForm });
        setIsEdit(false);
        setEditId(null);
        setShowForm(false);
        fetchRecords();
      } else {
        const data = await res.json();
        setMsg({ type: 'error', text: data.error || 'حدث خطأ' });
      }
    } catch {
      setMsg({ type: 'error', text: 'خطأ في الاتصال بالخادم' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (rec: CommissionRecord) => {
    setIsEdit(true);
    setEditId(rec.id);
    const f: any = { ...emptyForm };
    Object.keys(emptyForm).forEach(k => {
      const val = (rec as any)[k];
      if (val !== null && val !== undefined) {
        f[k] = typeof val === 'object' ? jsonToEditStr(val) : String(val);
      }
    });
    setForm(f);
    setShowForm(true);
    setSelectedRecord(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل نهائياً؟')) return;
    try {
      const res = await fetch(`/api/commission-data?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMsg({ type: 'success', text: 'تم الحذف بنجاح' });
        fetchRecords();
        if (selectedRecord?.id === id) setSelectedRecord(null);
      }
    } catch {
      setMsg({ type: 'error', text: 'فشل في الحذف' });
    }
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setIsEdit(false);
    setEditId(null);
    setMsg(null);
  };

  // Summary stats
  const totalVoters = records.reduce((s, r) => s + r.registeredVoters, 0);
  const avgTurnout = records.length ? (records.reduce((s, r) => s + r.historicalTurnout, 0) / records.length).toFixed(1) : '0';
  const totalCenters = records.reduce((s, r) => s + (r.districtCenters || 0), 0);
  const totalStations = records.reduce((s, r) => s + (r.districtStations || 0), 0);

  // Filter records
  const filtered = records.filter(r => {
    if (searchQ) {
      const q = searchQ.toLowerCase();
      return r.district.includes(q) || r.subDistrict.includes(q) || r.pollingCenter.includes(q);
    }
    return true;
  });

  // ── Tab content for FORM ──
  const renderFormTab = () => {
    switch (activeTab) {
      case 'pre-election':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="عدد الناخبين المسجلين (المحافظة)"><NumInput value={form.provinceRegistered} onChange={v => setF('provinceRegistered', v)} placeholder="495,000" /></Field>
            <Field label="عدد الناخبين المسجلين (القضاء)"><NumInput value={form.districtRegistered} onChange={v => setF('districtRegistered', v)} placeholder="85,000" /></Field>
            <Field label="عدد الناخبين المسجلين (الناحية)"><NumInput value={form.subDistrictRegistered} onChange={v => setF('subDistrictRegistered', v)} placeholder="25,000" /></Field>
            <Field label="نسبة المشاركة الفعلية (%)"><NumInput value={form.actualTurnout} onChange={v => setF('actualTurnout', v)} placeholder="42.5" /></Field>
            <Field label="عدد الذكور"><NumInput value={form.genderMale} onChange={v => setF('genderMale', v)} placeholder="44,200" /></Field>
            <Field label="عدد الإناث"><NumInput value={form.genderFemale} onChange={v => setF('genderFemale', v)} placeholder="40,800" /></Field>
            <Field label="مراكز الاقتراع (المحافظة)"><NumInput value={form.provinceCenters} onChange={v => setF('provinceCenters', v)} /></Field>
            <Field label="مراكز الاقتراع (القضاء)"><NumInput value={form.districtCenters} onChange={v => setF('districtCenters', v)} /></Field>
            <Field label="مراكز الاقتراع (الناحية)"><NumInput value={form.subDistrictCenters} onChange={v => setF('subDistrictCenters', v)} /></Field>
            <Field label="محطات الاقتراع (المحافظة)"><NumInput value={form.provinceStations} onChange={v => setF('provinceStations', v)} /></Field>
            <Field label="محطات الاقتراع (القضاء)"><NumInput value={form.districtStations} onChange={v => setF('districtStations', v)} /></Field>
            <Field label="محطات الاقتراع (الناحية)"><NumInput value={form.subDistrictStations} onChange={v => setF('subDistrictStations', v)} /></Field>
            <Field label="عدد الناخبين لكل مركز"><NumInput value={form.votersPerCenter} onChange={v => setF('votersPerCenter', v)} /></Field>
            <Field label="نسبة تحديث سجل الناخبين (%)"><NumInput value={form.registryUpdateRate} onChange={v => setF('registryUpdateRate', v)} placeholder="85.0" /></Field>
            <Field label="عدد الناخبين الجدد"><NumInput value={form.newVotersCount} onChange={v => setF('newVotersCount', v)} /></Field>
            <Field label="التوزيع العمري (JSON)" span={2}><TextArea value={form.ageDistribution} onChange={v => setF('ageDistribution', v)} placeholder='{"18-25": 1200, "26-35": 3400, "36-50": 4200, "50+": 2100}' /></Field>
            <Field label="المستوى التعليمي (JSON)" span={2}><TextArea value={form.educationDistribution} onChange={v => setF('educationDistribution', v)} placeholder='{"ابتدائية": 500, "متوسطة": 800, "بكالوريوس": 1200}' /></Field>
            <Field label="التوزيع الحضري/الريفي (JSON)" span={2}><TextArea value={form.urbanRuralRatio} onChange={v => setF('urbanRuralRatio', v)} placeholder='{"حضري": 60, "ريفي": 40}' /></Field>
          </div>
        );
      case 'results':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="أصوات كل حزب/قائمة (JSON)" span={2}><TextArea value={form.votesPerParty} onChange={v => setF('votesPerParty', v)} placeholder='[{"party":"تحالف الفتح","votes":12500},{"party":"التيار الصدري","votes":9800}]' rows={3} /></Field>
            <Field label="نسبة أصوات كل حزب (JSON)" span={2}><TextArea value={form.percentagePerParty} onChange={v => setF('percentagePerParty', v)} placeholder='[{"party":"تحالف الفتح","pct":25.3}]' rows={2} /></Field>
            <Field label="أصوات كل مرشح (JSON)" span={2}><TextArea value={form.votesPerCandidate} onChange={v => setF('votesPerCandidate', v)} placeholder='[{"name":"أحمد محمد","votes":3200}]' rows={3} /></Field>
            <Field label="نسبة أصوات كل مرشح (JSON)" span={2}><TextArea value={form.percentagePerCandidate} onChange={v => setF('percentagePerCandidate', v)} placeholder='[{"name":"أحمد محمد","pct":8.5}]' rows={2} /></Field>
            <Field label="النتائج حسب مركز الاقتراع (JSON)" span={2}><TextArea value={form.resultsByCenter} onChange={v => setF('resultsByCenter', v)} rows={3} /></Field>
            <Field label="المقاعد لكل حزب (JSON)" span={2}><TextArea value={form.seatsPerParty} onChange={v => setF('seatsPerParty', v)} placeholder='[{"party":"تحالف الفتح","seats":3}]' rows={2} /></Field>
            <Field label="نسبة المشاركة المتوقعة (%)"><NumInput value={form.expectedTurnoutRate} onChange={v => setF('expectedTurnoutRate', v)} placeholder="45.0" /></Field>
            <Field label="النتائج حسب المحافظة/القضاء/الناحية (JSON)" span={2}><TextArea value={form.resultsGeographic} onChange={v => setF('resultsGeographic', v)} rows={3} /></Field>
            <Field label="ترتيب المرشحين داخل المنطقة (JSON)" span={2}><TextArea value={form.candidateRanking} onChange={v => setF('candidateRanking', v)} rows={2} /></Field>
            <Field label="نسبة فوز المرشح لكل مركز (JSON)" span={2}><TextArea value={form.candidateWinRateByCenter} onChange={v => setF('candidateWinRateByCenter', v)} rows={2} /></Field>
          </div>
        );
      case 'analysis':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="نتائج الانتخابات السابقة (JSON)" span={2}><TextArea value={form.previousResults} onChange={v => setF('previousResults', v)} placeholder='{"2021":{"party":"الفتح","votes":11000}, "2018":{"party":"سائرون","votes":9500}}' rows={3} /></Field>
            <Field label="التغير في نسبة المشاركة (%)"><NumInput value={form.turnoutChange} onChange={v => setF('turnoutChange', v)} placeholder="-3.5" /></Field>
            <Field label="ترتيب المنطقة بالقوة الانتخابية"><NumInput value={form.regionRankByStrength} onChange={v => setF('regionRankByStrength', v)} placeholder="3" /></Field>
            <Field label="نسبة مساهمة المنطقة من الإجمالي (%)"><NumInput value={form.regionContribution} onChange={v => setF('regionContribution', v)} placeholder="12.5" /></Field>
            <Field label="التغير في قوة الأحزاب (JSON)" span={2}><TextArea value={form.partyStrengthChange} onChange={v => setF('partyStrengthChange', v)} placeholder='[{"party":"الفتح","change":"+2.5%"},{"party":"سائرون","change":"-1.2%"}]' rows={3} /></Field>
          </div>
        );
      case 'variable':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="المزاج الشعبي">
              <div className="relative">
                <select className="w-full bg-el-surface border border-el-outline-variant rounded h-8 px-2 text-[11px] appearance-none pr-8 focus:outline-none focus:border-el-primary cursor-pointer"
                  value={form.popularMood} onChange={e => setF('popularMood', e.target.value)}>
                  <option value="">اختر المزاج</option>
                  {MOOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-el-outline pointer-events-none" />
              </div>
            </Field>
            <Field label="نسبة الرضا أو الغضب (%)"><NumInput value={form.satisfactionRate} onChange={v => setF('satisfactionRate', v)} placeholder="55.0" /></Field>
            <Field label="القضايا الساخنة (JSON)" span={2}><TextArea value={form.hotIssues} onChange={v => setF('hotIssues', v)} placeholder='["البطالة","انقطاع الكهرباء","نقص الخدمات الصحية"]' rows={2} /></Field>
            <Field label="اتجاهات الرأي (JSON)" span={2}><TextArea value={form.opinionTrends} onChange={v => setF('opinionTrends', v)} placeholder='{"تأييد_الحكومة": 35, "معارضة": 45, "محايد": 20}' rows={2} /></Field>
            <Field label="قوة الخصوم (JSON)" span={2}><TextArea value={form.opponentStrength} onChange={v => setF('opponentStrength', v)} placeholder='[{"name":"مرشح X","strength":70},{"name":"مرشح Y","strength":55}]' rows={2} /></Field>
            <Field label="الأحداث المؤثرة (JSON)" span={2}><TextArea value={form.influentialEvents} onChange={v => setF('influentialEvents', v)} placeholder='["زيارة رئيس الوزراء","احتجاجات البطالة"]' rows={2} /></Field>
            <Field label="الاتجاه الرقمي (JSON)" span={2}><TextArea value={form.digitalTrend} onChange={v => setF('digitalTrend', v)} placeholder='{"فيسبوك":"إيجابي","تلغرام":"سلبي","تويتر":"محايد"}' rows={2} /></Field>
          </div>
        );
      case 'early-warning':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="المناطق المهددة بخسارة الأصوات (JSON)" span={2}><TextArea value={form.threatenedRegions} onChange={v => setF('threatenedRegions', v)} placeholder='["ناحية الفهود","حي الحسين"]' rows={2} /></Field>
            <Field label="المناطق القابلة للاختراق (JSON)" span={2}><TextArea value={form.penetrableRegions} onChange={v => setF('penetrableRegions', v)} placeholder='["قضاء الرفاعي","ناحية البطحاء"]' rows={2} /></Field>
            <Field label="المناطق الآمنة (JSON)" span={2}><TextArea value={form.safeRegions} onChange={v => setF('safeRegions', v)} placeholder='["مركز الناصرية","حي العروبة"]' rows={2} /></Field>
            <Field label="المناطق المتأرجحة (JSON)" span={2}><TextArea value={form.swingRegions} onChange={v => setF('swingRegions', v)} placeholder='["قضاء سوق الشيوخ","ناحية الإصلاح"]' rows={2} /></Field>
            <Field label="المناطق ذات المشاركة المنخفضة (JSON)" span={2}><TextArea value={form.lowTurnoutRegions} onChange={v => setF('lowTurnoutRegions', v)} placeholder='["ناحية الجبايش","قضاء الغراف"]' rows={2} /></Field>
            <Field label="المناطق ذات المنافسة العالية (JSON)" span={2}><TextArea value={form.highCompetitionRegions} onChange={v => setF('highCompetitionRegions', v)} placeholder='["مركز الناصرية","قضاء الشطرة"]' rows={2} /></Field>
          </div>
        );
      default: return null;
    }
  };

  // ── Tab content for DETAIL view ──
  const renderDetailTab = (rec: CommissionRecord) => {
    const InfoRow = ({ label, value }: { label: string; value: any }) => (
      <div className="flex justify-between items-start py-1.5 border-b border-el-outline-variant/30 last:border-0">
        <span className="text-[11px] text-el-on-surface-variant font-medium">{label}</span>
        <span className="text-[11px] font-bold text-el-on-surface font-mono text-left max-w-[60%] break-words">{value ?? '—'}</span>
      </div>
    );
    const JsonBlock = ({ label, value }: { label: string; value: any }) => (
      <div className="mt-2">
        <span className="text-[10px] font-bold text-el-primary block mb-1">{label}</span>
        <pre className="bg-el-surface-container-low p-2 rounded text-[10px] text-el-on-surface font-mono overflow-x-auto max-h-32 whitespace-pre-wrap" dir="ltr">{displayJson(value)}</pre>
      </div>
    );

    switch (detailTab) {
      case 'pre-election':
        return (
          <div className="space-y-1">
            <InfoRow label="الناخبين (المحافظة)" value={rec.provinceRegistered?.toLocaleString()} />
            <InfoRow label="الناخبين (القضاء)" value={rec.districtRegistered?.toLocaleString()} />
            <InfoRow label="الناخبين (الناحية)" value={rec.subDistrictRegistered?.toLocaleString()} />
            <InfoRow label="نسبة المشاركة الفعلية" value={rec.actualTurnout ? `${rec.actualTurnout}%` : null} />
            <InfoRow label="الذكور" value={rec.genderMale?.toLocaleString()} />
            <InfoRow label="الإناث" value={rec.genderFemale?.toLocaleString()} />
            <InfoRow label="مراكز (محافظة/قضاء/ناحية)" value={`${rec.provinceCenters || '—'} / ${rec.districtCenters || '—'} / ${rec.subDistrictCenters || '—'}`} />
            <InfoRow label="محطات (محافظة/قضاء/ناحية)" value={`${rec.provinceStations || '—'} / ${rec.districtStations || '—'} / ${rec.subDistrictStations || '—'}`} />
            <InfoRow label="ناخبين/مركز" value={rec.votersPerCenter?.toLocaleString()} />
            <InfoRow label="تحديث السجل" value={rec.registryUpdateRate ? `${rec.registryUpdateRate}%` : null} />
            <InfoRow label="الناخبين الجدد" value={rec.newVotersCount?.toLocaleString()} />
            {rec.ageDistribution && <JsonBlock label="التوزيع العمري" value={rec.ageDistribution} />}
            {rec.educationDistribution && <JsonBlock label="المستوى التعليمي" value={rec.educationDistribution} />}
            {rec.urbanRuralRatio && <JsonBlock label="الحضري/الريفي" value={rec.urbanRuralRatio} />}
          </div>
        );
      case 'results':
        return (
          <div className="space-y-1">
            <InfoRow label="نسبة المشاركة المتوقعة" value={rec.expectedTurnoutRate ? `${rec.expectedTurnoutRate}%` : null} />
            {rec.votesPerParty && <JsonBlock label="أصوات الأحزاب" value={rec.votesPerParty} />}
            {rec.percentagePerParty && <JsonBlock label="نسب الأحزاب" value={rec.percentagePerParty} />}
            {rec.votesPerCandidate && <JsonBlock label="أصوات المرشحين" value={rec.votesPerCandidate} />}
            {rec.seatsPerParty && <JsonBlock label="المقاعد لكل حزب" value={rec.seatsPerParty} />}
            {rec.candidateRanking && <JsonBlock label="ترتيب المرشحين" value={rec.candidateRanking} />}
            {rec.resultsGeographic && <JsonBlock label="النتائج الجغرافية" value={rec.resultsGeographic} />}
          </div>
        );
      case 'analysis':
        return (
          <div className="space-y-1">
            <InfoRow label="تغير المشاركة" value={rec.turnoutChange ? `${rec.turnoutChange > 0 ? '+' : ''}${rec.turnoutChange}%` : null} />
            <InfoRow label="مساهمة المنطقة" value={rec.regionContribution ? `${rec.regionContribution}%` : null} />
            <InfoRow label="ترتيب القوة الانتخابية" value={rec.regionRankByStrength} />
            {rec.previousResults && <JsonBlock label="نتائج سابقة" value={rec.previousResults} />}
            {rec.partyStrengthChange && <JsonBlock label="تغير قوة الأحزاب" value={rec.partyStrengthChange} />}
          </div>
        );
      case 'variable':
        return (
          <div className="space-y-1">
            <InfoRow label="المزاج الشعبي" value={rec.popularMood} />
            <InfoRow label="نسبة الرضا/الغضب" value={rec.satisfactionRate ? `${rec.satisfactionRate}%` : null} />
            {rec.hotIssues && <JsonBlock label="القضايا الساخنة" value={rec.hotIssues} />}
            {rec.opinionTrends && <JsonBlock label="اتجاهات الرأي" value={rec.opinionTrends} />}
            {rec.opponentStrength && <JsonBlock label="قوة الخصوم" value={rec.opponentStrength} />}
            {rec.influentialEvents && <JsonBlock label="الأحداث المؤثرة" value={rec.influentialEvents} />}
            {rec.digitalTrend && <JsonBlock label="الاتجاه الرقمي" value={rec.digitalTrend} />}
          </div>
        );
      case 'early-warning':
        return (
          <div className="space-y-1">
            {rec.threatenedRegions && <JsonBlock label="المناطق المهددة" value={rec.threatenedRegions} />}
            {rec.penetrableRegions && <JsonBlock label="القابلة للاختراق" value={rec.penetrableRegions} />}
            {rec.safeRegions && <JsonBlock label="المناطق الآمنة" value={rec.safeRegions} />}
            {rec.swingRegions && <JsonBlock label="المتأرجحة" value={rec.swingRegions} />}
            {rec.lowTurnoutRegions && <JsonBlock label="مشاركة منخفضة" value={rec.lowTurnoutRegions} />}
            {rec.highCompetitionRegions && <JsonBlock label="منافسة عالية" value={rec.highCompetitionRegions} />}
            {!rec.threatenedRegions && !rec.penetrableRegions && !rec.safeRegions && !rec.swingRegions && !rec.lowTurnoutRegions && !rec.highCompetitionRegions && (
              <p className="text-[11px] text-el-on-surface-variant text-center py-4">لا توجد بيانات إنذار مبكر مسجلة لهذا السجل</p>
            )}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-[1440px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[24px] leading-[32px] font-bold text-el-primary flex items-center gap-2">
            <Landmark className="w-7 h-7 text-el-primary" /> بيانات المفوضية العليا للانتخابات
          </h1>
          <p className="text-[12px] leading-[16px] text-el-on-surface-variant mt-1">
            إدارة وتحليل البيانات الرسمية للمفوضية — 45 حقلاً عبر 5 تبويبات متخصصة
          </p>
        </div>
        <div className="flex gap-2">
          {showForm && (
            <button onClick={() => { resetForm(); setShowForm(false); }}
              className="bg-el-surface-container border border-el-outline-variant text-el-on-surface px-4 py-2 rounded text-[14px] leading-[20px] font-medium hover:bg-el-surface-container-high transition-all">
              إلغاء
            </button>
          )}
          <button onClick={() => { if (showForm) { resetForm(); setShowForm(false); } else { setShowForm(true); } }}
            className="bg-el-primary text-el-on-primary px-4 py-2 rounded flex items-center gap-2 hover:opacity-90 transition-all shadow-sm">
            {showForm ? <Eye className="w-[18px] h-[18px]" /> : <Plus className="w-[18px] h-[18px]" />}
            <span className="text-[14px] leading-[20px] font-medium">{showForm ? 'عرض السجلات' : 'إضافة سجل مفوضية'}</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="إجمالي الناخبين المسجلين" value={totalVoters.toLocaleString()} icon={Users} color="bg-blue-100 text-blue-600" />
        <StatCard label="متوسط نسبة المشاركة" value={`${avgTurnout}%`} icon={Activity} color="bg-emerald-100 text-emerald-600" />
        <StatCard label="عدد مراكز الاقتراع" value={totalCenters || records.length} icon={Building2} color="bg-violet-100 text-violet-600" />
        <StatCard label="عدد محطات الاقتراع" value={totalStations || '—'} icon={MapPin} color="bg-amber-100 text-amber-600" />
      </div>

      {/* Message */}
      {msg && (
        <div className={`p-3 rounded flex items-center gap-2 text-[12px] ${msg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {/* ───────── FORM ───────── */}
      {showForm && (
        <section className="bg-el-surface-container-lowest border border-el-outline-variant rounded-lg shadow-sm overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-el-outline-variant">
            <h3 className="text-[18px] font-bold text-el-primary flex items-center gap-2">
              <Landmark className="w-5 h-5" />
              {isEdit ? 'تعديل سجل المفوضية' : 'إضافة سجل مفوضية جديد'}
            </h3>
            <span className="text-[11px] text-el-on-surface-variant/70 bg-el-surface-container px-3 py-1 rounded">محافظة ذي قار</span>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Basic fields */}
            <div className="p-4 border-b border-el-outline-variant bg-el-surface-container-low">
              <h4 className="text-[13px] font-bold text-el-primary mb-3 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-el-secondary" /> البيانات الجغرافية الأساسية
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field label="القضاء *">
                  <div className="relative">
                    <select required className="w-full bg-el-surface border border-el-outline-variant rounded h-8 px-2 text-[11px] appearance-none pr-8 focus:outline-none focus:border-el-primary cursor-pointer"
                      value={form.district} onChange={e => setF('district', e.target.value)}>
                      {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-el-outline pointer-events-none" />
                  </div>
                </Field>
                <Field label="الناحية"><TextInput value={form.subDistrict} onChange={v => setF('subDistrict', v)} placeholder="المركز" /></Field>
                <Field label="مركز الاقتراع"><TextInput value={form.pollingCenter} onChange={v => setF('pollingCenter', v)} placeholder="مدرسة الحسن البصري" /></Field>
                <Field label="رقم المحطة"><TextInput value={form.ballotStation} onChange={v => setF('ballotStation', v)} placeholder="1" /></Field>
                <Field label="عدد الناخبين المسجلين *"><NumInput value={form.registeredVoters} onChange={v => setF('registeredVoters', v)} placeholder="5000" /></Field>
                <Field label="نسبة المشاركة التاريخية (%)"><NumInput value={form.historicalTurnout} onChange={v => setF('historicalTurnout', v)} placeholder="42.5" /></Field>
                <Field label="نسبة المشاركة المتوقعة (%)"><NumInput value={form.expectedTurnout} onChange={v => setF('expectedTurnout', v)} placeholder="45.0" /></Field>
              </div>
            </div>

            {/* Tab navigation */}
            <div className="flex overflow-x-auto border-b border-el-outline-variant bg-el-surface-container">
              {TABS.map(t => (
                <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold whitespace-nowrap border-b-2 transition-all ${activeTab === t.id ? `border-el-primary ${t.color}` : 'border-transparent text-el-on-surface-variant hover:text-el-on-surface'}`}>
                  <t.icon className="w-4 h-4" /> {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-4">
              {renderFormTab()}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 p-4 border-t border-el-outline-variant bg-el-surface-container-low">
              <button type="button" onClick={() => { resetForm(); setShowForm(false); }}
                className="px-4 py-2 rounded border border-el-outline-variant text-el-on-surface text-[13px] hover:bg-el-surface-container-high transition-all">
                إلغاء
              </button>
              <button type="submit" disabled={submitting}
                className="bg-el-primary text-el-on-primary px-6 py-2 rounded flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-sm">
                <Save className="w-4 h-4" />
                <span className="text-[13px] font-medium">{submitting ? 'جاري الحفظ...' : isEdit ? 'تحديث السجل' : 'حفظ السجل'}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ───────── LIST ───────── */}
      {!showForm && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-el-outline" />
              <input className="w-full bg-el-surface-container-lowest border border-el-outline-variant rounded h-9 pr-9 pl-3 text-[12px] focus:outline-none focus:border-el-primary"
                value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="بحث في القضاء، الناحية، أو المركز..." />
            </div>
            <div className="relative w-full sm:w-48">
              <select className="w-full bg-el-surface-container-lowest border border-el-outline-variant rounded h-9 px-2 text-[11px] appearance-none pr-8 focus:outline-none focus:border-el-primary cursor-pointer"
                value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}>
                <option value="">كل الأقضية</option>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-el-outline pointer-events-none" />
            </div>
            <button onClick={() => { setLoading(true); fetchRecords(); }}
              className="h-9 px-3 rounded border border-el-outline-variant text-el-on-surface-variant hover:bg-el-surface-container-high transition-all flex items-center gap-1">
              <RefreshCw className="w-4 h-4" /> <span className="text-[11px]">تحديث</span>
            </button>
          </div>

          {/* Records List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-el-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 bg-el-surface-container-lowest border border-el-outline-variant rounded-lg">
              <Landmark className="w-12 h-12 text-el-outline mx-auto mb-3" />
              <p className="text-[14px] text-el-on-surface-variant font-medium">لا توجد سجلات مفوضية مسجلة</p>
              <p className="text-[11px] text-el-on-surface-variant/70 mt-1">اضغط "إضافة سجل مفوضية" لإدخال بيانات جديدة</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map(rec => (
                <div key={rec.id}
                  className={`bg-el-surface-container-lowest border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${selectedRecord?.id === rec.id ? 'border-el-primary ring-1 ring-el-primary/30' : 'border-el-outline-variant/50'}`}
                  onClick={() => { setSelectedRecord(rec); setDetailTab('pre-election'); }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-[14px] font-bold text-el-on-surface">{rec.district}</h4>
                      <p className="text-[11px] text-el-on-surface-variant">{rec.subDistrict} — {rec.pollingCenter}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={e => { e.stopPropagation(); handleEdit(rec); }}
                        className="p-1.5 rounded hover:bg-el-surface-container-high transition-all" title="تعديل">
                        <Edit2 className="w-3.5 h-3.5 text-el-primary" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(rec.id); }}
                        className="p-1.5 rounded hover:bg-red-50 transition-all" title="حذف">
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-el-surface-container-low rounded p-1.5">
                      <p className="text-[9px] text-el-on-surface-variant">مسجلين</p>
                      <p className="text-[13px] font-bold text-el-primary font-mono">{rec.registeredVoters.toLocaleString()}</p>
                    </div>
                    <div className="bg-el-surface-container-low rounded p-1.5">
                      <p className="text-[9px] text-el-on-surface-variant">المشاركة</p>
                      <p className="text-[13px] font-bold text-emerald-600 font-mono">{rec.actualTurnout || rec.historicalTurnout}%</p>
                    </div>
                    <div className="bg-el-surface-container-low rounded p-1.5">
                      <p className="text-[9px] text-el-on-surface-variant">المحطة</p>
                      <p className="text-[13px] font-bold text-el-on-surface font-mono">{rec.ballotStation}</p>
                    </div>
                  </div>
                  {rec.popularMood && (
                    <div className="mt-2 text-[10px] text-el-on-surface-variant">
                      المزاج: <span className={`font-bold ${rec.popularMood === 'إيجابي' ? 'text-green-600' : rec.popularMood === 'سلبي' ? 'text-red-600' : 'text-amber-600'}`}>{rec.popularMood}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Detail Panel */}
          {selectedRecord && (
            <section className="bg-el-surface-container-lowest border border-el-outline-variant rounded-lg shadow-sm overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-el-outline-variant">
                <div>
                  <h3 className="text-[16px] font-bold text-el-primary">{selectedRecord.district} — {selectedRecord.subDistrict}</h3>
                  <p className="text-[11px] text-el-on-surface-variant">{selectedRecord.pollingCenter} | محطة {selectedRecord.ballotStation}</p>
                </div>
                <button onClick={() => setSelectedRecord(null)} className="p-2 rounded hover:bg-el-surface-container-high transition-all">
                  <X className="w-5 h-5 text-el-on-surface-variant" />
                </button>
              </div>
              <div className="flex overflow-x-auto border-b border-el-outline-variant bg-el-surface-container">
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setDetailTab(t.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold whitespace-nowrap border-b-2 transition-all ${detailTab === t.id ? `border-el-primary ${t.color}` : 'border-transparent text-el-on-surface-variant hover:text-el-on-surface'}`}>
                    <t.icon className="w-4 h-4" /> {t.label}
                  </button>
                ))}
              </div>
              <div className="p-4 max-h-[500px] overflow-y-auto">
                {renderDetailTab(selectedRecord)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}