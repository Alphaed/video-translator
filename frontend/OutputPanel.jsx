/* global React, Card, Pill, PipelineStepper, PIPELINE_STEPS, LiveStatus */

function OutputPanel({ activeIndex, confirmStep = -1, progress, completed, taskId, file, lang }) {
  const idle = activeIndex === -1 && !completed && confirmStep === -1;

  return (
    <Card style={{
      display: 'grid',
      gridTemplateRows: 'auto auto 1fr auto',
      gap: 18,
      height: '100%',
      boxSizing: 'border-box',
    }}>

      {/* ── 标题 ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚙️</span>
          <h6 style={{ fontFamily: 'var(--font-sans-cjk)', margin: 0, fontSize: 16 }}>处理结果</h6>
        </div>
        {idle      && <Pill tone="pending">等待上传视频</Pill>}
        {!idle && !completed && confirmStep === -1 && (
          <Pill tone="running">{`Step ${activeIndex + 1} · ${PIPELINE_STEPS[activeIndex]?.name ?? ''}`}</Pill>
        )}
        {completed && <Pill tone="success">✅ 已完成</Pill>}
      </div>

      {/* ── 流水线步骤条 ─────────────────────────── */}
      <PipelineStepper activeIndex={activeIndex} completed={completed} confirmStep={confirmStep}/>

      {/* ── 实时日志（flex: 1 直接在 Card 内撑满）────── */}
      <LiveStatus activeIndex={activeIndex} progress={progress} completed={completed} taskId={taskId} lang={lang}/>

      {/* ── 总体进度条 ────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: 'var(--ink-500)' }}>总体进度</span>
          <span style={{ color: 'var(--ink-700)', fontFamily: 'var(--font-mono)' }}>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: 8, background: 'var(--ink-100)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: completed ? '#6BCE93' : 'var(--accent)',
            borderRadius: 999,
            transition: 'width var(--dur-slow) var(--ease-out)',
          }}/>
        </div>
      </div>

    </Card>
  );
}

window.OutputPanel = OutputPanel;
