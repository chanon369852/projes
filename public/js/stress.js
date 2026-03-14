// Stress Analysis Page Logic

async function loadStressPage() {
  const contentArea = document.getElementById('contentArea');
  
  contentArea.innerHTML = `
    <div class="stress-dashboard">
      <!-- Main Stress Gauge -->
      <div class="card stress-main-card">
        <div class="stress-gauge-container">
          <div class="stress-gauge" id="stressGauge">
            <svg viewBox="0 0 200 120">
              <!-- Background arc -->
              <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#E5E7EB" stroke-width="20" stroke-linecap="round"/>
              <!-- Value arc -->
              <path id="stressArc" d="M 20 100 A 80 80 0 0 1 20 100" fill="none" stroke="url(#stressGradient)" stroke-width="20" stroke-linecap="round"/>
              
              <defs>
                <linearGradient id="stressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style="stop-color:#10B981"/>
                  <stop offset="50%" style="stop-color:#F59E0B"/>
                  <stop offset="100%" style="stop-color:#EF4444"/>
                </linearGradient>
              </defs>
            </svg>
            <div class="gauge-value">
              <span class="score" id="stressScore">0</span>
              <span class="label">Stress Score</span>
            </div>
          </div>
          <div class="stress-status" id="stressStatus">
            <i class="fas fa-smile"></i>
            <span>ปกติ</span>
          </div>
        </div>
      </div>

      <!-- Stress Breakdown -->
      <div class="card stress-breakdown">
        <div class="card-header">
          <div class="card-title">
            <i class="fas fa-chart-bar"></i>
            <span>การวิเคราะห์ภาระงาน</span>
          </div>
        </div>
        <div class="card-body">
          <div class="breakdown-grid">
            <div class="breakdown-item">
              <div class="breakdown-icon tasks">
                <i class="fas fa-tasks"></i>
              </div>
              <div class="breakdown-info">
                <span class="value" id="taskCount">0</span>
                <span class="label">งานรอทำ</span>
              </div>
            </div>
            <div class="breakdown-item">
              <div class="breakdown-icon urgent">
                <i class="fas fa-exclamation-triangle"></i>
              </div>
              <div class="breakdown-info">
                <span class="value" id="urgentCount">0</span>
                <span class="label">งานเร่งด่วน</span>
              </div>
            </div>
            <div class="breakdown-item">
              <div class="breakdown-icon schedule">
                <i class="fas fa-calendar"></i>
              </div>
              <div class="breakdown-info">
                <span class="value" id="todayClasses">0</span>
                <span class="label">คาบเรียนวันนี้</span>
              </div>
            </div>
            <div class="breakdown-item">
              <div class="breakdown-icon time">
                <i class="fas fa-clock"></i>
              </div>
              <div class="breakdown-info">
                <span class="value" id="freeHours">0</span>
                <span class="label">ชั่วโมงว่าง</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div class="card stress-recommendations">
        <div class="card-header">
          <div class="card-title">
            <i class="fas fa-lightbulb"></i>
            <span>คำแนะนำจากระบบ</span>
          </div>
        </div>
        <div class="card-body" id="recommendationsList">
          <div class="loading">กำลังวิเคราะห์...</div>
        </div>
      </div>

      <!-- Stress History -->
      <div class="card stress-history">
        <div class="card-header">
          <div class="card-title">
            <i class="fas fa-history"></i>
            <span>ประวัติความเครียด (7 วัน)</span>
          </div>
        </div>
        <div class="card-body">
          <canvas id="stressChart" width="600" height="200"></canvas>
        </div>
      </div>
    </div>
  `;

  await loadStressData();
}

async function loadStressData() {
  try {
    const [currentData, historyData] = await Promise.all([
      api.getStressAnalysis(),
      api.getStressHistory(7)
    ]);

    // Update stress score
    const score = currentData.stress_score || 0;
    const level = currentData.stress_level || 'normal';
    
    document.getElementById('stressScore').textContent = score;
    
    // Update gauge arc
    const maxScore = 100;
    const percentage = Math.min(score / maxScore, 1);
    const angle = percentage * 180; // 0-180 degrees
    const radians = (angle - 180) * Math.PI / 180;
    const x = 100 + 80 * Math.cos(radians);
    const y = 100 + 80 * Math.sin(radians);
    const largeArc = angle > 180 ? 1 : 0;
    
    document.getElementById('stressArc').setAttribute('d', 
      `M 20 100 A 80 80 0 ${largeArc} 1 ${x} ${y}`
    );

    // Update status
    const statusEl = document.getElementById('stressStatus');
    const statusConfig = {
      normal: { icon: 'smile', text: 'ปกติ', color: '#10B981' },
      moderate: { icon: 'meh', text: 'เริ่มเครียด', color: '#F59E0B' },
      high: { icon: 'frown', text: 'เครียดสูง', color: '#EF4444' },
      critical: { icon: 'dizzy', text: 'วิกฤต', color: '#7C3AED' }
    };
    
    const config = statusConfig[level] || statusConfig.normal;
    statusEl.innerHTML = `<i class="fas fa-${config.icon}"></i><span>${config.text}</span>`;
    statusEl.style.color = config.color;

    // Update breakdown
    const analysis = currentData.analysis || {};
    document.getElementById('taskCount').textContent = analysis.total_pending || 0;
    document.getElementById('urgentCount').textContent = analysis.urgent_count || 0;
    document.getElementById('todayClasses').textContent = analysis.class_count || 0;
    document.getElementById('freeHours').textContent = (analysis.free_hours || 0).toFixed(1);

    // Update recommendations
    const recs = currentData.recommendations || [];
    document.getElementById('recommendationsList').innerHTML = recs.length > 0 
      ? recs.map(r => `
          <div class="recommendation-item">
            <i class="fas fa-check-circle"></i>
            <span>${r}</span>
          </div>
        `).join('')
      : '<div class="empty-state"><p>ไม่มีคำแนะนำพิเศษ</p></div>';

    // Render history chart
    renderStressChart(historyData.history || []);

  } catch (error) {
    console.error('Failed to load stress data:', error);
  }
}

function renderStressChart(history) {
  const canvas = document.getElementById('stressChart');
  if (!canvas || history.length === 0) return;

  const ctx = canvas.getContext('2d');
  const padding = 40;
  const chartWidth = canvas.width - padding * 2;
  const chartHeight = canvas.height - padding * 2;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw grid lines
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '12px Kanit';
    ctx.textAlign = 'right';
    ctx.fillText(100 - i * 25, padding - 10, y + 4);
  }

  // Draw line
  if (history.length > 0) {
    const xStep = chartWidth / (history.length - 1 || 1);
    
    ctx.beginPath();
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    history.forEach((point, i) => {
      const x = padding + xStep * i;
      const y = padding + chartHeight - (point.stress_score / 100) * chartHeight;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();

    // Draw points
    history.forEach((point, i) => {
      const x = padding + xStep * i;
      const y = padding + chartHeight - (point.stress_score / 100) * chartHeight;
      
      ctx.beginPath();
      ctx.fillStyle = '#6366F1';
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();

      // X-axis labels
      const date = new Date(point.analysis_date);
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '11px Kanit';
      ctx.textAlign = 'center';
      ctx.fillText(date.getDate() + '/' + (date.getMonth() + 1), x, canvas.height - 10);
    });
  }
}

// Calculate stress manually
async function calculateStress() {
  try {
    await api.request('/stress/calculate', { method: 'POST' });
    await loadStressData();
  } catch (error) {
    alert('Failed to calculate stress');
  }
}
