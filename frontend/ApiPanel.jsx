/* global React */
/* ApiPanel — API 管理模态框
   按流水线步骤分组展示所有外部 API，支持编辑 Key 和模型并保存到后端 */

const { useState, useEffect } = React;
const _API_CFG = 'http://127.0.0.1:8000';

// ── 单个 Key 输入行 ──────────────────────────────────────────
function KeyField({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ width: 80, fontSize: 11, color: 'var(--ink-500)', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || '请输入 API Key'}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '6px 32px 6px 10px',
            fontFamily: 'var(--font-mono)', fontSize: 11,
            border: '1px solid var(--ink-200)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--ink-0)',
            color: 'var(--ink-900)',
            outline: 'none',
          }}
        />
        <button
          onClick={() => setShow(s => !s)}
          title={show ? '隐藏' : '显示'}
          style={{
            position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
            border: 'none', background: 'transparent', cursor: 'pointer',
            padding: 2, color: 'var(--ink-400)', fontSize: 13, lineHeight: 1,
          }}
        >
          {show ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  );
}

// ── 普通文本输入行 ────────────────────────────────────────────
function TextField({ label, value, onChange, disabled, hint, placeholder }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ width: 80, fontSize: 11, color: 'var(--ink-500)', flexShrink: 0 }}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        title={hint}
        placeholder={placeholder || ''}
        style={{
          flex: 1, boxSizing: 'border-box',
          padding: '6px 10px',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          border: '1px solid var(--ink-200)',
          borderRadius: 'var(--radius-sm)',
          background: disabled ? 'var(--ink-100)' : 'var(--ink-0)',
          color: disabled ? 'var(--ink-500)' : 'var(--ink-900)',
          cursor: disabled ? 'not-allowed' : 'text',
          outline: 'none',
        }}
      />
    </div>
  );
}

// ── 下拉选择行 ────────────────────────────────────────────────
function SelectField({ label, value, onChange, options, disabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ width: 80, fontSize: 11, color: 'var(--ink-500)', flexShrink: 0 }}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{
          flex: 1, padding: '6px 10px',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          border: '1px solid var(--ink-200)',
          borderRadius: 'var(--radius-sm)',
          background: disabled ? 'var(--ink-100)' : 'var(--ink-0)',
          color: disabled ? 'var(--ink-500)' : 'var(--ink-900)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── 步骤卡片容器 ──────────────────────────────────────────────
function StepCard({ stepLabel, service, badge, children }) {
  return (
    <div style={{
      border: '1px solid var(--ink-150)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px',
        background: 'var(--ink-50)',
        borderBottom: '1px solid var(--ink-150)',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
          background: 'var(--accent)', color: '#fff',
          padding: '2px 7px', borderRadius: 999,
        }}>
          {stepLabel}
        </span>
        <span style={{ fontSize: 12, color: 'var(--ink-700)', fontWeight: 600 }}>{service}</span>
        {badge && (
          <span style={{
            fontSize: 10, color: 'var(--ink-500)',
            background: 'var(--ink-100)', padding: '1px 7px', borderRadius: 999,
          }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ padding: '12px 14px 4px' }}>
        {children}
      </div>
    </div>
  );
}

// ── Provider 切换 Tab ─────────────────────────────────────────
function ProviderToggle({ value, onChange, options }) {
  return (
    <div style={{
      display: 'flex', gap: 0,
      border: '1px solid var(--ink-200)',
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
      marginBottom: 12,
      width: 'fit-content',
    }}>
      {options.map((opt, i) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '5px 16px',
              fontSize: 12,
              fontFamily: 'var(--font-sans-cjk)',
              border: 'none',
              borderRight: i < options.length - 1 ? '1px solid var(--ink-200)' : 'none',
              background: active ? 'var(--accent)' : 'var(--ink-0)',
              color: active ? '#fff' : 'var(--ink-600)',
              cursor: 'pointer',
              fontWeight: active ? 600 : 400,
              transition: 'background 120ms, color 120ms',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────────
function ApiPanel({ open, onClose }) {
  const [keys,        setKeys]        = useState({ dashscope: '', openai: '', syncso: '' });
  const [models,      setModels]      = useState({ asr: '', translate: '', tts: '', tts_voice: 'alloy' });
  const [ttsProvider, setTtsProvider] = useState('openai');   // 'openai' | 'voicebox'
  const [voicebox,    setVoicebox]    = useState({ url: 'http://127.0.0.1:17493', profile_id: '', engine: 'qwen', model_size: '1.7B' });
  const [vbProfiles,  setVbProfiles]  = useState([]);         // [{ id, name, language }]
  const [vbLoading,   setVbLoading]   = useState(false);      // 加载 Profile 中
  const [vbError,     setVbError]     = useState('');         // Profile 加载错误信息
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState(null);       // { type: 'success'|'error', msg }

  useEffect(() => {
    if (open) loadConfig();
  }, [open]);

  // 当切换到 Voicebox 时，自动尝试拉取 Profile 列表
  useEffect(() => {
    if (open && ttsProvider === 'voicebox') {
      loadVbProfiles();
    }
  }, [ttsProvider, open]);

  async function loadConfig() {
    setLoading(true);
    try {
      const res = await fetch(`${_API_CFG}/config/api`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setKeys({
        dashscope: data.api_keys?.dashscope || '',
        openai:    data.api_keys?.openai    || '',
        syncso:    data.api_keys?.syncso    || '',
      });
      setModels({
        asr:       data.models?.asr       || '',
        translate: data.models?.translate || '',
        tts:       data.models?.tts       || '',
        tts_voice: data.models?.tts_voice || 'alloy',
      });
      const provider = data.tts_provider || 'openai';
      setTtsProvider(provider);
      if (data.voicebox) {
        setVoicebox({
          url:        data.voicebox.url        || 'http://127.0.0.1:17493',
          profile_id: data.voicebox.profile_id || '',
          engine:     data.voicebox.engine     || 'qwen',
          model_size: data.voicebox.model_size || '1.7B',
        });
      }
    } catch (e) {
      showToast('error', '加载配置失败：' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadVbProfiles() {
    setVbLoading(true);
    setVbError('');
    try {
      const res = await fetch(`${_API_CFG}/voicebox/profiles`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const list = await res.json();
      setVbProfiles(list);
      if (list.length === 0) {
        setVbError('已连接 Voicebox，但暂无 Profile（请先在 Voicebox 中创建克隆声音）');
      }
    } catch (e) {
      setVbProfiles([]);
      setVbError(`无法加载 Profile：${e.message}`);
    } finally {
      setVbLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const body = {
        api_keys:     keys,
        models,
        tts_provider: ttsProvider,
        voicebox,
      };
      const res = await fetch(`${_API_CFG}/config/api`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      showToast('success', '✅ 配置已保存，立即生效');
    } catch (e) {
      showToast('error', '保存失败：' + e.message);
    } finally {
      setSaving(false);
    }
  }

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function setKey(k, v)   { setKeys(prev   => ({ ...prev, [k]: v })); }
  function setModel(k, v) { setModels(prev  => ({ ...prev, [k]: v })); }
  function setVb(k, v)    { setVoicebox(prev => ({ ...prev, [k]: v })); }

  if (!open) return null;

  const TTS_VOICES = [
    { value: 'alloy',   label: 'alloy' },
    { value: 'echo',    label: 'echo' },
    { value: 'fable',   label: 'fable' },
    { value: 'onyx',    label: 'onyx' },
    { value: 'nova',    label: 'nova' },
    { value: 'shimmer', label: 'shimmer' },
  ];

  const VB_ENGINES = [
    { value: 'qwen',             label: 'qwen（推荐）' },
    { value: 'qwen_custom_voice',label: 'qwen_custom_voice' },
    { value: 'luxtts',           label: 'luxtts' },
    { value: 'chatterbox',       label: 'chatterbox' },
    { value: 'chatterbox_turbo', label: 'chatterbox_turbo' },
    { value: 'tada',             label: 'tada' },
    { value: 'kokoro',           label: 'kokoro' },
  ];

  const VB_MODEL_SIZES = [
    { value: '0.6B', label: '0.6B（最快）' },
    { value: '1B',   label: '1B' },
    { value: '1.7B', label: '1.7B（推荐）' },
    { value: '3B',   label: '3B（最慢/最准）' },
  ];

  // Profile 下拉选项：先显示已选择的，再追加从服务获取的
  const profileOptions = [
    { value: '', label: vbLoading ? '加载中…' : '（不指定 Profile）' },
    ...vbProfiles.map(p => ({
      value: p.id,
      label: p.name ? `${p.name}${p.language ? ' · ' + p.language : ''}` : p.id,
    })),
  ];

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        animation: 'vt-fade-in 180ms var(--ease-out)',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 580,
        maxHeight: '88vh',
        background: 'var(--ink-0)',
        borderRadius: 'var(--radius-xl, 16px)',
        border: '1px solid var(--ink-150)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* ── 顶栏 ─────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid var(--ink-150)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚙️</span>
            <h6 style={{ fontFamily: 'var(--font-sans-cjk)', margin: 0, fontSize: 17, color: 'var(--ink-900)' }}>
              API 管理
            </h6>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none', background: 'var(--ink-100)', cursor: 'pointer',
              padding: '6px 14px', borderRadius: 'var(--radius-md)',
              fontSize: 13, color: 'var(--ink-700)',
              fontFamily: 'var(--font-sans-cjk)',
            }}
          >
            关闭
          </button>
        </div>

        {/* ── 主体（可滚动）────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-400)' }}>
              <div className="vt-typing" style={{ justifyContent: 'center', display: 'flex', gap: 4, marginBottom: 8 }}>
                <span/><span/><span/>
              </div>
              加载中…
            </div>
          ) : (
            <>
              {/* Step 2 · ASR */}
              <StepCard stepLabel="Step 2 · ASR" service="DashScope">
                <KeyField
                  label="API Key"
                  value={keys.dashscope}
                  onChange={v => setKey('dashscope', v)}
                  placeholder="sk-..."
                />
                <TextField
                  label="识别模型"
                  value={models.asr}
                  onChange={v => setModel('asr', v)}
                />
              </StepCard>

              {/* Step 3 · 翻译 */}
              <StepCard stepLabel="Step 3 · 翻译" service="OpenAI" badge="共享 Key（Step 4 · Step 6）">
                <KeyField
                  label="API Key"
                  value={keys.openai}
                  onChange={v => setKey('openai', v)}
                  placeholder="sk-proj-..."
                />
                <TextField
                  label="翻译模型"
                  value={models.translate}
                  onChange={v => setModel('translate', v)}
                />
              </StepCard>

              {/* Step 4 · TTS */}
              <StepCard
                stepLabel="Step 4 · TTS"
                service={ttsProvider === 'voicebox' ? 'Voicebox（本地）' : 'OpenAI'}
                badge={ttsProvider === 'openai' ? '使用 Step 3 Key' : undefined}
              >
                {/* Provider 切换 */}
                <ProviderToggle
                  value={ttsProvider}
                  onChange={v => { setTtsProvider(v); if (v === 'voicebox') loadVbProfiles(); }}
                  options={[
                    { value: 'openai',   label: 'OpenAI TTS' },
                    { value: 'voicebox', label: 'Voicebox 本地' },
                  ]}
                />

                {ttsProvider === 'openai' ? (
                  <>
                    <TextField
                      label="TTS 模型"
                      value={models.tts}
                      onChange={v => setModel('tts', v)}
                    />
                    <SelectField
                      label="TTS 声音"
                      value={models.tts_voice}
                      onChange={v => setModel('tts_voice', v)}
                      options={TTS_VOICES}
                    />
                  </>
                ) : (
                  <>
                    {/* Voicebox 配置 */}
                    <TextField
                      label="服务地址"
                      value={voicebox.url}
                      onChange={v => setVb('url', v)}
                      placeholder="http://127.0.0.1:17493"
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ width: 80, fontSize: 11, color: 'var(--ink-500)', flexShrink: 0 }}>声音 Profile</span>
                      <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                        <select
                          value={voicebox.profile_id}
                          onChange={e => setVb('profile_id', e.target.value)}
                          disabled={vbLoading}
                          style={{
                            flex: 1, padding: '6px 10px',
                            fontFamily: 'var(--font-mono)', fontSize: 11,
                            border: '1px solid var(--ink-200)',
                            borderRadius: 'var(--radius-sm)',
                            background: vbLoading ? 'var(--ink-100)' : 'var(--ink-0)',
                            color: 'var(--ink-900)', outline: 'none', cursor: 'pointer',
                          }}
                        >
                          {profileOptions.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={loadVbProfiles}
                          disabled={vbLoading}
                          title="刷新 Profile 列表"
                          style={{
                            padding: '5px 10px', fontSize: 13,
                            border: '1px solid var(--ink-200)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--ink-50)', cursor: 'pointer',
                            color: 'var(--ink-600)',
                          }}
                        >
                          {vbLoading ? '…' : '↻'}
                        </button>
                      </div>
                    </div>
                    {/* Profile 加载错误提示 */}
                    {vbError && (
                      <div style={{
                        marginBottom: 8,
                        padding: '7px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 11,
                        background: vbError.startsWith('已连接') ? '#F0FDF4' : '#FEF2F2',
                        border: `1px solid ${vbError.startsWith('已连接') ? '#BFE2CD' : '#FECACA'}`,
                        color: vbError.startsWith('已连接') ? '#166534' : '#991B1B',
                        lineHeight: 1.5,
                      }}>
                        {vbError.startsWith('已连接') ? 'ℹ️ ' : '❌ '}{vbError}
                      </div>
                    )}

                    <SelectField
                      label="引擎"
                      value={voicebox.engine}
                      onChange={v => setVb('engine', v)}
                      options={VB_ENGINES}
                    />
                    <SelectField
                      label="模型大小"
                      value={voicebox.model_size}
                      onChange={v => setVb('model_size', v)}
                      options={VB_MODEL_SIZES}
                    />
                    {/* Thai 语言警告 */}
                    <div style={{
                      marginTop: 4, marginBottom: 8,
                      padding: '8px 12px',
                      background: '#FFFBEB',
                      border: '1px solid #F6D860',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 11,
                      color: '#7A5C00',
                      lineHeight: 1.5,
                    }}>
                      ⚠️ Voicebox 不支持 <strong>Thai（泰语）</strong>。选择 Thai 作为目标语言并提交时，后端将返回错误。请切换为 OpenAI TTS 后再翻译泰语视频。
                    </div>
                  </>
                )}
              </StepCard>

              {/* Step 5 · 口型同步 */}
              <StepCard stepLabel="Step 5 · 口型同步" service="Sync.so" badge="sync-1.6.0">
                <KeyField
                  label="API Key"
                  value={keys.syncso}
                  onChange={v => setKey('syncso', v)}
                  placeholder="sk-..."
                />
              </StepCard>

              {/* Step 6 · 字幕 */}
              <StepCard stepLabel="Step 6 · 字幕" service="OpenAI Whisper" badge="使用 Step 3 Key">
                <TextField
                  label="ASR 模型"
                  value="whisper-1"
                  onChange={() => {}}
                  disabled
                  hint="字幕识别模型固定为 whisper-1"
                />
              </StepCard>
            </>
          )}
        </div>

        {/* ── 底栏：Toast + 保存 ───────────────────────── */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--ink-150)',
          flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {toast && (
            <div style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              background: toast.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)',
              border: `1px solid ${toast.type === 'success' ? '#BFE2CD' : '#F5B9B5'}`,
              color: toast.type === 'success' ? '#1F6A40' : '#8B281D',
              animation: 'vt-fade-in 200ms var(--ease-out)',
            }}>
              {toast.msg}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              width: '100%', padding: '10px 0',
              background: saving || loading ? 'var(--ink-300)' : 'var(--accent)',
              border: 'none', borderRadius: 'var(--radius-md)',
              cursor: saving || loading ? 'wait' : 'pointer',
              color: '#fff', fontSize: 14,
              fontFamily: 'var(--font-sans-cjk)',
              fontWeight: 600,
              transition: 'background var(--dur-base)',
            }}
          >
            {saving ? '保存中…' : '保存配置'}
          </button>
        </div>

      </div>
    </div>
  );
}

window.ApiPanel = ApiPanel;
