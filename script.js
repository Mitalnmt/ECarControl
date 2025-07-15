let carList = [];
let carIdCounter = 1;
let changeCarIndex = null; // null: chọn xe mới, số: đổi mã xe
let defaultTimeMinutes = 15; // Thời gian mặc định (phút)
let defaultTimeSeconds = 30; // Thời gian mặc định (giây)

// Thêm xe vào danh sách hoặc đổi mã xe
function selectCarCode(carCode) {
  const modalEl = document.getElementById('carModal');
  const modal = bootstrap.Modal.getInstance(modalEl);
  if (modal) modal.hide(); // Đóng modal NGAY lập tức

  setTimeout(() => {
    if (changeCarIndex === null) {
      addCar(carCode);
    } else {
      // Lưu tất cả mã xe cũ vào mảng oldCarCodes
      if (!carList[changeCarIndex].oldCarCodes) {
        carList[changeCarIndex].oldCarCodes = [];
      }
      if (carList[changeCarIndex].carCode !== carCode) {
        carList[changeCarIndex].oldCarCodes.push(carList[changeCarIndex].carCode);
      }
      carList[changeCarIndex].carCode = carCode;
      changeCarIndex = null;
      saveCarListToStorage();
      // renderCarList(); // BỎ
    }
  }, 100); // Đợi modal đóng xong mới render lại bảng
}

// Khi ấn nút chọn xe
const showModalBtn = document.getElementById('showModalBtn');
if (showModalBtn) {
  showModalBtn.addEventListener('click', function() {
    changeCarIndex = null;
  });
}

// Thêm xe vào danh sách
function addCar(carCode) {
  const now = new Date();
  const timeOut = new Date(now.getTime());  // Thời gian ra là thời gian hiện tại
  const timeIn = new Date(timeOut.getTime());  // Thời gian vào là 15 phút sau thời gian ra
  timeIn.setMinutes(timeOut.getMinutes() + defaultTimeMinutes);
  timeIn.setSeconds(timeOut.getSeconds() + defaultTimeSeconds);  // Thêm thời gian mặc định vào thời gian ra để có thời gian vào

  const car = {
    id: carIdCounter++,
    carCode: carCode,
    timeOut: timeOut,
    timeIn: timeIn,
    paid: false,
    done: false,
    timeChanged: "",  // Lưu giá trị cộng trừ
  };

  carList.push(car);
  saveCarListToStorage();
  // renderCarList(); // BỎ

  // Đóng modal sau khi chọn xe
  const modalEl = document.getElementById('carModal');
  const modal = bootstrap.Modal.getInstance(modalEl);
  if (modal) modal.hide();
}

// Render danh sách xe
function renderCarList() {
  const tbody = document.getElementById('car-list').getElementsByTagName('tbody')[0];
  tbody.innerHTML = '';  // Xóa các dòng cũ

  // Đếm số lượng xe theo mã xe (không phân biệt trạng thái)
  const countByCode = {};
  carList.forEach(car => {
    countByCode[car.carCode] = (countByCode[car.carCode] || 0) + 1;
  });

  carList.forEach((car, index) => {
    // Dòng chính
    const row = tbody.insertRow();

    // Kiểm tra trạng thái để set class
    if (car.isNullTime) {
      row.classList.add('null-time-done');
    } else if (car.done) {
      row.classList.add('done');
    } else if (getRemainingTimeInMillis(car.timeIn, car) <= 0) {
      row.classList.add('overdue');
    }
    // Nếu mã xe bị trùng, thêm class duplicate-done
    if (countByCode[car.carCode] >= 2) {
      row.classList.add('duplicate-done');
    }

    // Số thứ tự
    const cell1 = row.insertCell(0);
    cell1.textContent = index + 1;

    // Trạng thái
    const cell2 = row.insertCell(1);
    // Nút trạng thái: 'C' (vàng) hoặc 'R' (xanh)
    const isPaid = car.paid;
    cell2.innerHTML = `<button class="btn btn-status ${isPaid ? 'btn-success' : 'btn-warning'}" onclick="togglePaid(${index})">${isPaid ? 'R' : 'C'}</button>`;
    if (car.note) {
      cell2.innerHTML += ` <span class='car-note'>${car.note}</span>`;
    }

    // Mã xe mới + các mã xe cũ (nếu có)
    const cell3 = row.insertCell(2);
    let carCodeHtml = `<span>${car.carCode}</span>`;
    if (car.oldCarCodes && car.oldCarCodes.length > 0) {
      carCodeHtml += ` <span class='old-car-code-italic'>(` + car.oldCarCodes.map(code => `${code}`).join(', ') + `)</span>`;
    }
    cell3.innerHTML = carCodeHtml;

    // Thời gian ra và vào (hiển thị cả hai)
    const cell4 = row.insertCell(3);
    const timeOutFormatted = car.timeOut.toLocaleTimeString();
    const timeInFormatted = car.timeIn.toLocaleTimeString();
    cell4.innerHTML = `<div><span style='font-size:0.95em;'>Ra: <b>${timeOutFormatted}</b></span><br><span style='font-size:0.9em;color:#2196f3;'>Vào: <b>${timeInFormatted}</b></span></div>`;

    // Thời gian còn lại (hiển thị đếm ngược)
    const cell5 = row.insertCell(4);
    const remainingTime = getRemainingTime(car.timeIn, car);
    cell5.innerHTML = `<span class="countdown">${remainingTime}</span>`;

    // Action buttons (các nút)
    const cell6 = row.insertCell(5); // Đây là cột thứ 6 (index 5)
    cell6.innerHTML = `
      <button class="btn btn-success" onclick="toggleDone(${index})">${car.done ? 'Resume' : 'Done'}</button>
      <button class="btn btn-warning" onclick="changeCarCode(${index})">Đổi xe</button>
      <button class='btn btn-secondary' onclick='openRowActionModal(${index})'>...</button>
    `;

    // Không render dòng phụ nữa
  });

  // setTimeout(updateCountdowns, 1000); // BỎ, sẽ gọi ở ngoài
}

// Đếm ngược thời gian
function getRemainingTime(timeIn, car) {
  if (car && car.isNullTime) {
    if (!car.nullStartTime) return '00:00';
    const now = Date.now();
    const elapsed = Math.floor((now - car.nullStartTime) / 1000); // giây
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  if (car && car.done && car.pausedAt !== undefined) {
    if (car.pausedAt <= 0) return '00:00';
    const minutes = Math.floor(car.pausedAt / 60000);
    const seconds = Math.floor((car.pausedAt % 60000) / 1000);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  const remainingTimeInMillis = getRemainingTimeInMillis(timeIn, car);
  if (remainingTimeInMillis <= 0) return '00:00';
  const minutes = Math.floor(remainingTimeInMillis / 60000);
  const seconds = Math.floor((remainingTimeInMillis % 60000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Tính thời gian còn lại trong mili giây
function getRemainingTimeInMillis(timeIn, car) {
  if (car && car.isNullTime) return 0;
  if (car && car.done && car.pausedAt !== undefined) {
    return car.pausedAt;
  }
  const now = new Date();
  return timeIn - now;
}

// Cập nhật tất cả thời gian còn lại
function updateCountdowns() {
  // Kiểm tra xe hết thời gian để cảnh báo
  let hasOverdue = false;
  let needRerender = false;
  carList.forEach((car, idx) => {
    const wasOverdue = car._wasOverdue || false;
    const isOverdue = !car.done && !car.isNullTime && getRemainingTimeInMillis(car.timeIn, car) <= 0;
    if (isOverdue && !wasOverdue) {
      needRerender = true;
    }
    car._wasOverdue = isOverdue;
    if (isOverdue) {
      if (!overdueNotifiedIds.has(car.id)) {
        notifyOverdue(car);
        overdueNotifiedIds.add(car.id);
      }
      hasOverdue = true;
    } else {
      // Nếu xe không còn overdue, bỏ khỏi set để có thể cảnh báo lại nếu reset
      overdueNotifiedIds.delete(car.id);
    }
  });
  if (needRerender) {
    renderCarList();
  }
  // Cập nhật countdown cho từng dòng (nếu bảng đã render)
  const tbody = document.getElementById('car-list').getElementsByTagName('tbody')[0];
  if (tbody) {
    for (let i = 0; i < carList.length; i++) {
      const row = tbody.rows[i];
      if (row) {
        const countdownCell = row.cells[4];
        if (countdownCell) {
          countdownCell.innerHTML = `<span class="countdown">${getRemainingTime(carList[i].timeIn, carList[i])}</span>`;
        }
        row.classList.remove('done', 'overdue', 'null-time-done');
        const car = carList[i];
        if (car.isNullTime) {
          row.classList.add('null-time-done');
        } else if (car.done) {
          row.classList.add('done');
        } else if (getRemainingTimeInMillis(car.timeIn, car) <= 0) {
          row.classList.add('overdue');
        }
      }
    }
  }
  setTimeout(updateCountdowns, 1000);
}

// Toggle trạng thái thanh toán
function togglePaid(index) {
  carList[index].paid = !carList[index].paid;
  // Cập nhật lại nút trạng thái, không render lại toàn bộ bảng
  const tbody = document.getElementById('car-list').getElementsByTagName('tbody')[0];
  const row = tbody.rows[index];
  if (row) {
    const btn = row.cells[1].querySelector('button.btn-status');
    if (btn) {
      if (carList[index].paid) {
        btn.classList.remove('btn-warning');
        btn.classList.add('btn-success');
        btn.textContent = 'R';
      } else {
        btn.classList.remove('btn-success');
        btn.classList.add('btn-warning');
        btn.textContent = 'C';
      }
    }
  }
  // Lưu dữ liệu sau khi đã cập nhật UI
  saveCarListToStorage();
}

// Đổi mã xe
function changeCarCode(index) {
  changeCarIndex = index;
  // Mở modal
  const modalEl = document.getElementById('carModal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

// Thay đổi thời gian
function changeTime(index, delta = 1) {
  const car = carList[index];
  
  // Kiểm tra và thay đổi thời gian vào, giữ nguyên thời gian ra
  const newTimeIn = new Date(car.timeIn);
  newTimeIn.setSeconds(newTimeIn.getSeconds() + delta * 60);

  // Kiểm tra nếu thời gian vào không được phép nhỏ hơn thời gian ra
  if (newTimeIn < car.timeOut) {
    alert('Thời gian vào không thể nhỏ hơn thời gian ra!');
    return;
  }

  car.timeIn = newTimeIn;
  saveCarListToStorage();
  // Chỉ cập nhật lại countdown và class cho dòng này
  const tbody = document.getElementById('car-list').getElementsByTagName('tbody')[0];
  const row = tbody.rows[index];
  if (row) {
    // Cập nhật countdown
    const countdownCell = row.cells[4];
    if (countdownCell) {
      countdownCell.innerHTML = `<span class="countdown">${getRemainingTime(car.timeIn, car)}</span>`;
    }
    // Cập nhật class
    row.classList.remove('done', 'overdue');
    if (car.done) {
      row.classList.add('done');
    } else if (getRemainingTimeInMillis(car.timeIn, car) <= 0) {
      row.classList.add('overdue');
    }
  }
}

// Đánh dấu xe đã vào hoặc resume
function toggleDone(index) {
  const car = carList[index];
  if (car.isNullTime) {
    car.isNullTime = false;
    car.done = false;
    car.nullStartTime = undefined;
  } else if (!car.done) {
    car.done = true;
    car.pausedAt = getRemainingTimeInMillis(car.timeIn, car);
  } else {
    car.done = false;
    if (car.pausedAt > 0) {
      const now = new Date();
      car.timeIn = new Date(now.getTime() + car.pausedAt);
    }
    car.pausedAt = undefined; // Đảm bảo xóa pausedAt khi resume
  }
  // Cập nhật UI cục bộ cho dòng này
  const tbody = document.getElementById('car-list').getElementsByTagName('tbody')[0];
  const row = tbody.rows[index];
  if (row) {
    // Cập nhật nút Resume/Done
    const btn = row.cells[5].querySelector('button.btn.btn-success');
    if (btn) {
      btn.textContent = car.done ? 'Resume' : 'Done';
    }
    // Cập nhật class dòng
    row.classList.remove('done', 'overdue', 'null-time-done');
    if (car.isNullTime) {
      row.classList.add('null-time-done');
    } else if (car.done) {
      row.classList.add('done');
    } else if (getRemainingTimeInMillis(car.timeIn, car) <= 0) {
      row.classList.add('overdue');
    }
  }
  saveCarListToStorage();
}

// Xóa xe khỏi danh sách
function deleteCar(index) {
  if (!confirm('Bạn có chắc chắn muốn xóa dòng này?')) return;
  carList.splice(index, 1);
  saveCarListToStorage();
  // renderCarList(); // BỎ
}

// --- Lưu trữ Firebase Realtime Database ---
function saveCarListToStorage() {
  // Chuyển Date thành string ISO để lưu, pausedAt giữ nguyên kiểu số hoặc undefined
  const data = carList.map(car => {
    const obj = {
      ...car,
      timeOut: car.timeOut.toISOString(),
      timeIn: car.timeIn.toISOString(),
    };
    // pausedAt chỉ lưu nếu là số, nếu undefined thì bỏ
    if (typeof car.pausedAt === 'number') {
      obj.pausedAt = car.pausedAt;
    } else {
      delete obj.pausedAt;
    }
    return obj;
  });
  window.db.ref('carList').set(data);
  localStorage.setItem('carIdCounter', carIdCounter); // vẫn lưu idCounter local
}

function loadCarListFromStorage() {
  window.db.ref('carList').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      carList = data.map(car => {
        const obj = {
          ...car,
          timeOut: new Date(car.timeOut),
          timeIn: new Date(car.timeIn),
        };
        // pausedAt phải là số hoặc undefined
        if (typeof car.pausedAt === 'number') {
          obj.pausedAt = car.pausedAt;
        } else if (typeof car.pausedAt === 'string' && car.pausedAt !== '') {
          obj.pausedAt = Number(car.pausedAt);
        } else {
          obj.pausedAt = undefined;
        }
        return obj;
      });
    } else {
      carList = [];
    }
    renderCarList();
  });
  const idCounter = localStorage.getItem('carIdCounter');
  if (idCounter) carIdCounter = Number(idCounter);
}

// Gọi khi trang load
loadCarListFromStorage();
loadSettings();
renderCarList();
updateCountdowns();

// --- Xóa tất cả ---
let confirmDeleteAllCount = 0;
const deleteAllBtn = document.getElementById('deleteAllBtn');
const confirmDeleteAllBtn = document.getElementById('confirmDeleteAllBtn');
const confirmDeleteAllModalEl = document.getElementById('confirmDeleteAllModal');
const confirmDeleteAllCountSpan = document.getElementById('confirmDeleteAllCount');
let confirmDeleteAllModal;
if (confirmDeleteAllModalEl) {
  confirmDeleteAllModal = bootstrap.Modal.getOrCreateInstance(confirmDeleteAllModalEl);
}
if (deleteAllBtn) {
  deleteAllBtn.addEventListener('click', function() {
    confirmDeleteAllCount = 0;
    if (confirmDeleteAllCountSpan) confirmDeleteAllCountSpan.textContent = '0';
    if (confirmDeleteAllModal) confirmDeleteAllModal.show();
    if (settingsModal) settingsModal.hide(); // Đóng modal cài đặt
  });
}
if (confirmDeleteAllBtn) {
  confirmDeleteAllBtn.addEventListener('click', function() {
    confirmDeleteAllCount++;
    if (confirmDeleteAllCountSpan) confirmDeleteAllCountSpan.textContent = confirmDeleteAllCount;
    if (confirmDeleteAllCount >= 5) {
      carList = [];
      saveCarListToStorage();
      // renderCarList(); // BỎ
      if (confirmDeleteAllModal) confirmDeleteAllModal.hide();
    }
  });
}

// --- Modal chọn thời gian ---
let currentTimeIndex = null;
const timeModalEl = document.getElementById('timeModal');
const timeModal = timeModalEl ? bootstrap.Modal.getOrCreateInstance(timeModalEl) : null;
const minus5Btn = document.getElementById('minus5Btn');
const minus1Btn = document.getElementById('minus1Btn');
const plus1Btn = document.getElementById('plus1Btn');
const plus5Btn = document.getElementById('plus5Btn');
const nullTimeBtn = document.getElementById('nullTimeBtn');

function openTimeModal(index) {
  currentTimeIndex = index;
  if (timeModal) timeModal.show();
}

function changeTimeByDelta(deltaMin) {
  if (currentTimeIndex === null) return;
  const car = carList[currentTimeIndex];
  if (car.isNullTime) car.isNullTime = false; // Nếu đang null thì bỏ null khi chỉnh lại
  const newTimeIn = new Date(car.timeIn);
  newTimeIn.setMinutes(newTimeIn.getMinutes() + deltaMin);
  if (newTimeIn < car.timeOut) {
    alert('Thời gian vào không thể nhỏ hơn thời gian ra!');
    return;
  }
  car.timeIn = newTimeIn;
  saveCarListToStorage();
  // renderCarList(); // BỎ
}

// Gán event listener một lần duy nhất
if (minus5Btn) {
  minus5Btn.onclick = () => { 
    changeTimeByDelta(-5); 
  };
}
if (minus1Btn) {
  minus1Btn.onclick = () => { 
    changeTimeByDelta(-1); 
  };
}
if (plus1Btn) {
  plus1Btn.onclick = () => { 
    changeTimeByDelta(1); 
  };
}
if (plus5Btn) {
  plus5Btn.onclick = () => { 
    changeTimeByDelta(5); 
  };
}
if (nullTimeBtn) {
  nullTimeBtn.onclick = () => {
    if (currentTimeIndex === null) return;
    const car = carList[currentTimeIndex];
    car.isNullTime = true;
    car.done = true;
    car.nullStartTime = Date.now();
    saveCarListToStorage();
    // renderCarList(); // BỎ
    if (timeModal) timeModal.hide();
  };
}

// Reset currentTimeIndex khi đóng modal
if (timeModalEl) {
  timeModalEl.addEventListener('hidden.bs.modal', function() {
    currentTimeIndex = null;
  });
}

// --- Modal thao tác dòng ---
let currentRowActionIndex = null;
const rowActionModalEl = document.getElementById('rowActionModal');
const rowActionTimeBtn = document.getElementById('rowActionTimeBtn');
const rowActionDeleteBtn = document.getElementById('rowActionDeleteBtn');
const rowActionNoteBtn = document.getElementById('rowActionNoteBtn');
let rowActionModal = null;
if (rowActionModalEl) {
  rowActionModal = bootstrap.Modal.getOrCreateInstance(rowActionModalEl);
}
function openRowActionModal(index) {
  currentRowActionIndex = index;
  if (rowActionModal) rowActionModal.show();
}
if (rowActionTimeBtn) {
  rowActionTimeBtn.onclick = function() {
    if (currentRowActionIndex !== null) openTimeModal(currentRowActionIndex);
    if (rowActionModal) rowActionModal.hide();
  };
}
if (rowActionDeleteBtn) {
  rowActionDeleteBtn.onclick = function() {
    if (currentRowActionIndex !== null) deleteCar(currentRowActionIndex);
    if (rowActionModal) rowActionModal.hide();
  };
}
if (rowActionNoteBtn) {
  rowActionNoteBtn.onclick = function() {
    if (currentRowActionIndex !== null) {
      const car = carList[currentRowActionIndex];
      const note = prompt('Nhập ghi chú cho xe:', car.note || '');
      if (note !== null) {
        car.note = note.trim();
        saveCarListToStorage();
        // renderCarList(); // BỎ
      }
    }
    if (rowActionModal) rowActionModal.hide();
  };
}

// --- Cài đặt ---
const settingsBtn = document.getElementById('settingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const settingsModalEl = document.getElementById('settingsModal');
const defaultMinutesInput = document.getElementById('defaultMinutesInput');
const defaultSecondsInput = document.getElementById('defaultSecondsInput');
let settingsModal = null;
if (settingsModalEl) {
  settingsModal = bootstrap.Modal.getOrCreateInstance(settingsModalEl);
}
if (settingsBtn && settingsModal) {
  settingsBtn.addEventListener('click', function() {
    loadSettings();
    settingsModal.show();
  });
}
if (saveSettingsBtn && settingsModal) {
  saveSettingsBtn.addEventListener('click', function() {
    saveSettings();
    settingsModal.hide();
  });
}
if (defaultMinutesInput) {
  defaultMinutesInput.addEventListener('input', updateDefaultTimeDisplay);
}
if (defaultSecondsInput) {
  defaultSecondsInput.addEventListener('input', updateDefaultTimeDisplay);
}

function loadSettings() {
  const savedDefaultTime = localStorage.getItem('defaultTimeMinutes');
  const savedDefaultSeconds = localStorage.getItem('defaultTimeSeconds');
  if (savedDefaultTime) {
    defaultTimeMinutes = Number(savedDefaultTime);
  }
  if (savedDefaultSeconds) {
    defaultTimeSeconds = Number(savedDefaultSeconds);
  }
  const defaultMinutesInput = document.getElementById('defaultMinutesInput');
  const defaultSecondsInput = document.getElementById('defaultSecondsInput');
  const defaultTimeDisplay = document.getElementById('defaultTimeDisplay');
  if (defaultMinutesInput) {
    defaultMinutesInput.value = defaultTimeMinutes;
  }
  if (defaultSecondsInput) {
    defaultSecondsInput.value = defaultTimeSeconds;
  }
  if (defaultTimeDisplay) {
    defaultTimeDisplay.textContent = `${String(defaultTimeMinutes).padStart(2, '0')}:${String(defaultTimeSeconds).padStart(2, '0')}`;
  }
}

function saveSettings() {
  const defaultMinutesInput = document.getElementById('defaultMinutesInput');
  const defaultSecondsInput = document.getElementById('defaultSecondsInput');
  if (defaultMinutesInput) {
    defaultTimeMinutes = Number(defaultMinutesInput.value);
    localStorage.setItem('defaultTimeMinutes', defaultTimeMinutes);
  }
  if (defaultSecondsInput) {
    defaultTimeSeconds = Number(defaultSecondsInput.value);
    localStorage.setItem('defaultTimeSeconds', defaultTimeSeconds);
  }
  const defaultTimeDisplay = document.getElementById('defaultTimeDisplay');
  if (defaultTimeDisplay) {
    defaultTimeDisplay.textContent = `${String(defaultTimeMinutes).padStart(2, '0')}:${String(defaultTimeSeconds).padStart(2, '0')}`;
  }
}

function updateDefaultTimeDisplay() {
  const defaultMinutesInput = document.getElementById('defaultMinutesInput');
  const defaultSecondsInput = document.getElementById('defaultSecondsInput');
  const defaultTimeDisplay = document.getElementById('defaultTimeDisplay');
  if (defaultMinutesInput) {
    defaultTimeMinutes = Number(defaultMinutesInput.value);
  }
  if (defaultSecondsInput) {
    defaultTimeSeconds = Number(defaultSecondsInput.value);
  }
  if (defaultTimeDisplay) {
    defaultTimeDisplay.textContent = `${String(defaultTimeMinutes).padStart(2, '0')}:${String(defaultTimeSeconds).padStart(2, '0')}`;
  }
}

// --- Xe tạm thời ---
function getTempCars() {
  const temp = localStorage.getItem('tempCars');
  return temp ? JSON.parse(temp) : [];
}
function saveTempCars(tempCars) {
  localStorage.setItem('tempCars', JSON.stringify(tempCars));
}
function addTempCar(code) {
  let tempCars = getTempCars();
  code = code.trim();
  if (!code) return;
  // Không thêm trùng
  if (tempCars.includes(code)) return;
  tempCars.push(code);
  saveTempCars(tempCars);
  renderTempCarButtons();
}
function renderTempCarButtons() {
  // Tìm modal chọn xe
  const modalBody = document.querySelector('#carModal .modal-body');
  if (!modalBody) return;
  // Xóa các nút xe tạm thời cũ
  const oldTempDiv = document.getElementById('tempCarBtnGroup');
  if (oldTempDiv) oldTempDiv.remove();
  const tempCars = getTempCars();
  if (tempCars.length === 0) return;
  // Tạo nhóm nút mới
  const div = document.createElement('div');
  div.className = 'mb-2';
  div.id = 'tempCarBtnGroup';
  tempCars.forEach(code => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-outline-primary m-1';
    btn.textContent = code;
    btn.onclick = function() { selectCarCode(code); };
    div.appendChild(btn);
  });
  // Thêm vào đầu modal
  modalBody.insertBefore(div, modalBody.firstChild);
}
// Gán sự kiện cho nút thêm xe tạm thời
const addTempCarBtn = document.getElementById('addTempCarBtn');
const tempCarInput = document.getElementById('tempCarInput');
if (addTempCarBtn && tempCarInput) {
  addTempCarBtn.onclick = function() {
    addTempCar(tempCarInput.value);
    tempCarInput.value = '';
  };
  tempCarInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      addTempCar(tempCarInput.value);
      tempCarInput.value = '';
    }
  });
}
// Khi mở modal chọn xe, render lại xe tạm thời
const carModalEl = document.getElementById('carModal');
if (carModalEl) {
  carModalEl.addEventListener('show.bs.modal', renderTempCarButtons);
}

// --- Cảnh báo xe hết thời gian ---
let overdueNotifiedIds = new Set();
function notifyOverdue(car) {
  // Hiện toast
  const toastBody = document.getElementById('overdueToastBody');
  if (toastBody) {
    toastBody.textContent = `Xe ${car.carCode} đã hết thời gian!`;
  }
  const toastEl = document.getElementById('overdueToast');
  if (toastEl) {
    const toast = bootstrap.Toast.getOrCreateInstance(toastEl);
    toast.show();
  }
  // Phát âm thanh beep
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
    oscillator.onended = () => ctx.close();
  } catch (e) {}
  // Rung thiết bị nếu hỗ trợ
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }
  // Hiện notification nếu đã cấp quyền
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Xe hết thời gian', {
      body: `Xe ${car.carCode} đã hết thời gian!`,
      icon: '', // Có thể thêm icon nếu muốn
    });
  }
}

// --- Notification xin quyền ---
const enableNotifyBtn = document.getElementById('enableNotifyBtn');
if (enableNotifyBtn) {
  enableNotifyBtn.onclick = function() {
    if (!('Notification' in window)) {
      alert('Trình duyệt không hỗ trợ thông báo!');
      return;
    }
    Notification.requestPermission().then(function(permission) {
      if (permission === 'granted') {
        alert('Đã bật thông báo!');
      } else {
        alert('Bạn đã từ chối hoặc chưa cấp quyền thông báo.');
      }
    });
  };
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', function() {
    window.open('https://mitalnmt.github.io/ECarbyMital/', '_self');
  });
}