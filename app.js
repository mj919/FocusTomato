// ==================== 状态管理 ====================
let timerSeconds = 1500; // 当前计时器秒数
let isRunning = false;
let timerInterval = null;
let currentMode = 'focus'; // focus, short, long

// 默认设置
const defaultSettings = {
  focusTime: 25,
  shortBreak: 5,
  longBreak: 15,
  dailyGoal: 8,
  soundEnabled: true,
  volume: 50
};

// ==================== DOM 元素 ====================
const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');

// ==================== 音频 ====================
let audioContext = null;

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playNotificationSound() {
  const settings = getSettings();
  if (!settings.soundEnabled) return;
  
  initAudio();
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(settings.volume / 100 * 0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
  
  // 播放第二声
  setTimeout(() => {
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);
    osc2.frequency.setValueAtTime(1000, audioContext.currentTime);
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(settings.volume / 100 * 0.3, audioContext.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    osc2.start(audioContext.currentTime);
    osc2.stop(audioContext.currentTime + 0.5);
  }, 200);
}

// ==================== 工具函数 ====================
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function getSettings() {
  const saved = localStorage.getItem('tomatoSettings');
  return saved ? JSON.parse(saved) : defaultSettings;
}

function saveSettings() {
  const settings = {
    focusTime: parseInt(document.getElementById('focusTime').value) || 25,
    shortBreak: parseInt(document.getElementById('shortBreak').value) || 5,
    longBreak: parseInt(document.getElementById('longBreak').value) || 15,
    dailyGoal: parseInt(document.getElementById('dailyGoal').value) || 8,
    soundEnabled: document.getElementById('soundEnabled').checked,
    volume: parseInt(document.getElementById('volume').value) || 50
  };
  
  localStorage.setItem('tomatoSettings', JSON.stringify(settings));
  document.getElementById('volumeValue').textContent = settings.volume + '%';
  
  // 更新模式按钮文字
  updateModeButtons();
  
  // 如果当前是默认状态，更新计时器
  if (!isRunning && currentMode === 'focus') {
    timerSeconds = settings.focusTime * 60;
    render();
  }
}

function loadSettings() {
  const settings = getSettings();
  document.getElementById('focusTime').value = settings.focusTime;
  document.getElementById('shortBreak').value = settings.shortBreak;
  document.getElementById('longBreak').value = settings.longBreak;
  document.getElementById('dailyGoal').value = settings.dailyGoal;
  document.getElementById('soundEnabled').checked = settings.soundEnabled;
  document.getElementById('volume').value = settings.volume;
  document.getElementById('volumeValue').textContent = settings.volume + '%';
  
  updateModeButtons();
}

function updateModeButtons() {
  const settings = getSettings();
  const buttons = document.querySelectorAll('.mode-btn');
  buttons.forEach(btn => {
    const mode = btn.dataset.mode;
    if (mode === 'focus') {
      btn.textContent = `专注 ${settings.focusTime}分`;
    } else if (mode === 'short') {
      btn.textContent = `短休息 ${settings.shortBreak}分`;
    } else if (mode === 'long') {
      btn.textContent = `长休息 ${settings.longBreak}分`;
    }
  });
}

// ==================== 计时器核心 ====================
function render() {
  timerDisplay.textContent = formatTime(timerSeconds);
  document.title = `${formatTime(timerSeconds)} - Focus Tomato`;
}

function startTimer() {
  if (isRunning) return;
  
  initAudio(); // 用户交互时初始化音频
  isRunning = true;
  timerDisplay.classList.add('running');
  startBtn.textContent = '⏵ 运行中';
  startBtn.disabled = true;
  
  timerInterval = setInterval(() => {
    timerSeconds--;
    render();
    
    if (timerSeconds <= 0) {
      clearInterval(timerInterval);
      isRunning = false;
      timerDisplay.classList.remove('running');
      startBtn.textContent = '▶ 开始';
      startBtn.disabled = false;
      
      onTimerComplete();
    }
  }, 1000);
}

function pauseTimer() {
  if (!isRunning) return;
  clearInterval(timerInterval);
  isRunning = false;
  timerDisplay.classList.remove('running');
  startBtn.textContent = '▶ 继续';
  startBtn.disabled = false;
}

function resetTimer() {
  pauseTimer();
  const settings = getSettings();
  
  if (currentMode === 'focus') {
    timerSeconds = settings.focusTime * 60;
  } else if (currentMode === 'short') {
    timerSeconds = settings.shortBreak * 60;
  } else {
    timerSeconds = settings.longBreak * 60;
  }
  
  render();
  startBtn.textContent = '▶ 开始';
}

function setMode(mode) {
  currentMode = mode;
  pauseTimer();
  
  const settings = getSettings();
  const modeButtons = document.querySelectorAll('.mode-btn');
  
  modeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  
  if (mode === 'focus') {
    timerSeconds = settings.focusTime * 60;
  } else if (mode === 'short') {
    timerSeconds = settings.shortBreak * 60;
  } else {
    timerSeconds = settings.longBreak * 60;
  }
  
  render();
  startBtn.textContent = '▶ 开始';
}

function onTimerComplete() {
  playNotificationSound();
  
  // 只有专注模式才计数
  if (currentMode === 'focus') {
    // 更新今日统计
    const todayKey = getTodayKey();
    const todayData = JSON.parse(localStorage.getItem('tomatoToday') || '{}');
    
    if (todayData.date !== todayKey) {
      todayData.date = todayKey;
      todayData.count = 0;
      todayData.minutes = 0;
    }
    
    const settings = getSettings();
    todayData.count = (todayData.count || 0) + 1;
    todayData.minutes = (todayData.minutes || 0) + settings.focusTime;
    
    localStorage.setItem('tomatoToday', JSON.stringify(todayData));
    
    // 更新历史记录
    updateHistory(todayKey, todayData.count);
    
    // 更新累计统计
    const total = JSON.parse(localStorage.getItem('tomatoTotal') || '{"count":0,"minutes":0}');
    total.count += 1;
    total.minutes += settings.focusTime;
    localStorage.setItem('tomatoTotal', JSON.stringify(total));
    
    // 刷新显示
    loadStats();
    updateGoalProgress();
    
    // 显示完成动画
    timerDisplay.classList.add('celebrate');
    setTimeout(() => timerDisplay.classList.remove('celebrate'), 500);
    
    // 提示用户
    showNotification('🎉 太棒了！完成一个番茄钟！');
  } else {
    showNotification('☕ 休息结束，继续加油！');
  }
  
  // 自动切换到下一个模式
  if (currentMode === 'focus') {
    setMode('short');
  } else {
    setMode('focus');
  }
}

function showNotification(message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Focus Tomato', { body: message, icon: '🍅' });
  }
  alert(message);
}

// ==================== 统计功能 ====================
function loadStats() {
  const todayKey = getTodayKey();
  const todayData = JSON.parse(localStorage.getItem('tomatoToday') || '{}');
  
  // 检查是否是新的一天
  if (todayData.date !== todayKey) {
    document.getElementById('todayCount').textContent = '0';
    document.getElementById('todayMinutes').textContent = '0';
  } else {
    document.getElementById('todayCount').textContent = todayData.count || 0;
    document.getElementById('todayMinutes').textContent = todayData.minutes || 0;
  }
  
  const total = JSON.parse(localStorage.getItem('tomatoTotal') || '{"count":0,"minutes":0}');
  document.getElementById('totalCount').textContent = total.count;
  document.getElementById('totalMinutes').textContent = total.minutes;
  
  loadHistory();
}

function updateHistory(date, count) {
  const history = JSON.parse(localStorage.getItem('tomatoHistory') || '{}');
  history[date] = count;
  
  // 只保留最近7天
  const dates = Object.keys(history).sort().reverse();
  if (dates.length > 7) {
    dates.slice(7).forEach(d => delete history[d]);
  }
  
  localStorage.setItem('tomatoHistory', JSON.stringify(history));
}

function loadHistory() {
  const history = JSON.parse(localStorage.getItem('tomatoHistory') || '{}');
  const historyList = document.getElementById('historyList');
  
  const dates = Object.keys(history).sort().reverse();
  
  if (dates.length === 0) {
    historyList.innerHTML = '<div style="text-align: center; color: var(--text-light); padding: 20px;">暂无记录</div>';
    return;
  }
  
  historyList.innerHTML = dates.map(date => {
    const d = new Date(date);
    const dayName = isToday(date) ? '今天' : 
                    isYesterday(date) ? '昨天' : 
                    `${d.getMonth() + 1}月${d.getDate()}日`;
    return `
      <div class="history-item">
        <span class="history-date">${dayName}</span>
        <span class="history-count">🍅 ${history[date]} 个</span>
      </div>
    `;
  }).join('');
}

function isToday(dateStr) {
  return dateStr === getTodayKey();
}

function isYesterday(dateStr) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateStr === yesterday.toISOString().split('T')[0];
}

function updateGoalProgress() {
  const settings = getSettings();
  const todayKey = getTodayKey();
  const todayData = JSON.parse(localStorage.getItem('tomatoToday') || '{}');
  
  const count = (todayData.date === todayKey) ? (todayData.count || 0) : 0;
  const goal = settings.dailyGoal;
  const progress = Math.min((count / goal) * 100, 100);
  
  document.getElementById('goalText').textContent = `${count} / ${goal} 番茄`;
  document.getElementById('goalBar').style.width = `${progress}%`;
}

// ==================== 任务管理 ====================
function getTasks() {
  return JSON.parse(localStorage.getItem('tomatoTasks') || '[]');
}

function saveTasks(tasks) {
  localStorage.setItem('tomatoTasks', JSON.stringify(tasks));
  renderTasks();
}

function addTask() {
  const input = document.getElementById('taskInput');
  const text = input.value.trim();
  
  if (!text) return;
  
  const tasks = getTasks();
  tasks.unshift({
    id: Date.now(),
    text: text,
    completed: false,
    createdAt: new Date().toISOString()
  });
  
  saveTasks(tasks);
  input.value = '';
}

function toggleTask(id) {
  const tasks = getTasks();
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks(tasks);
  }
}

function deleteTask(id) {
  const tasks = getTasks().filter(t => t.id !== id);
  saveTasks(tasks);
}

function renderTasks() {
  const tasks = getTasks();
  const taskList = document.getElementById('taskList');
  
  if (tasks.length === 0) {
    taskList.innerHTML = '<div style="text-align: center; color: var(--text-light); padding: 20px;">暂无任务，添加一个吧~</div>';
    document.getElementById('taskStats').textContent = '已完成 0 / 0 个任务';
    return;
  }
  
  const completed = tasks.filter(t => t.completed).length;
  document.getElementById('taskStats').textContent = `已完成 ${completed} / ${tasks.length} 个任务`;
  
  taskList.innerHTML = tasks.map(task => `
    <div class="task-item ${task.completed ? 'completed' : ''}">
      <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask(${task.id})"></div>
      <span class="task-text">${escapeHtml(task.text)}</span>
      <button class="task-delete" onclick="deleteTask(${task.id})">✕</button>
    </div>
  `).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== 标签页切换 ====================
function switchTab(tabName) {
  // 更新按钮状态
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // 更新内容显示
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ==================== 登录 ====================
function login() {
  const code = document.getElementById('code').value;
  if (code === 'mjs最帅') {
    localStorage.setItem('auth', '1');
    document.getElementById('login').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    document.getElementById('app').style.justifyContent = 'center';
    
    // 请求通知权限
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  } else {
    alert('邀请码错误~');
  }
}

// ==================== 重置数据 ====================
function resetAllData() {
  if (confirm('确定要重置所有数据吗？这将清除所有番茄钟记录和任务列表。')) {
    localStorage.removeItem('tomatoToday');
    localStorage.removeItem('tomatoTotal');
    localStorage.removeItem('tomatoHistory');
    localStorage.removeItem('tomatoTasks');
    localStorage.removeItem('tomatoSettings');
    
    loadSettings();
    loadStats();
    renderTasks();
    updateGoalProgress();
    
    alert('数据已重置！');
  }
}

// ==================== 初始化 ====================
function init() {
  // 检查登录状态
  if (localStorage.getItem('auth') === '1') {
    document.getElementById('login').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    document.getElementById('app').style.justifyContent = 'center';
  }
  
  // 加载设置
  loadSettings();
  
  // 设置初始时间
  const settings = getSettings();
  timerSeconds = settings.focusTime * 60;
  render();
  
  // 加载统计
  loadStats();
  updateGoalProgress();
  
  // 加载任务
  renderTasks();
  
  // 注册 Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
}

// 启动应用
init();