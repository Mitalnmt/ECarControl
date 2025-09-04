let carList = [];
let carIdCounter = 1;
let changeCarIndex = null; // null: chọn xe mới, số: đổi mã xe
let defaultTimeMinutes = 15; // Thời gian mặc định (phút)
let defaultTimeSeconds = 30; // Thời gian mặc định (giây)
let xStepMinutes = 15; // Bước tăng/giảm cho nút -1x/+1x (phút)

// Trạng thái chọn nhiều dòng
let selectedIds = new Set();
let multiSelectMode = false; // Bật/tắt chọn nhiều bằng click dòng (kích hoạt 1 lần)

// Biến cho chức năng undo
let undoHistory = []; // Lưu lịch sử các thao tác
let maxUndoSteps = 20; // Số bước undo tối đa
let undoInProgress = false; // Cờ để tránh undo liên tiếp



// Hàm lưu trạng thái hiện tại vào lịch sử
function saveToHistory() {
  try {
    // Kiểm tra xem có thay đổi thực sự không
    const currentState = JSON.stringify(carList.map(car => ({
      ...car,
      timeOut: car.timeOut.toISOString(),
      timeIn: car.timeIn.toISOString()
    })));
    
    // So sánh với trạng thái cuối cùng trong lịch sử
    if (undoHistory.length > 0) {
      const lastState = undoHistory[undoHistory.length - 1];
      if (lastState === currentState) {
        return; // Không lưu nếu trạng thái giống nhau
      }
    }
    
    undoHistory.push(currentState);
    
    // Giới hạn số bước undo
    if (undoHistory.length > maxUndoSteps) {
      undoHistory.shift();
    }
  } catch (error) {
    console.error('Lỗi khi lưu lịch sử:', error);
  }
}

// Hàm undo - quay lại trạng thái trước đó
function undo() {
  // Kiểm tra xem có đang thực hiện undo không
  if (undoInProgress) {
    return;
  }
  
  if (undoHistory.length === 0) {
    showToast('Không có thao tác nào để quay lại!', 'warning');
    return;
  }
  
  // Đặt cờ để tránh undo liên tiếp
  undoInProgress = true;
  
  try {
    const previousState = undoHistory.pop();
    const previousCarList = JSON.parse(previousState).map(car => ({
      ...car,
      timeOut: new Date(car.timeOut),
      timeIn: new Date(car.timeIn)
    }));
    
    // Cập nhật carList
    carList = previousCarList;
    
    // Gọi saveCarListToStorage với skipHistory=true để không tạo loop
    saveCarListToStorage(true);
    
    // Render lại giao diện ngay lập tức
    renderCarList();
    
    // Hiển thị thông báo
    showToast(`Đã quay lại! (${carList.length} xe)`, 'success');
    
  } catch (error) {
    console.error('Lỗi khi thực hiện undo:', error);
    showToast('Có lỗi xảy ra khi undo!', 'danger');
  } finally {
    // Reset cờ sau 300ms
    setTimeout(() => {
      undoInProgress = false;
    }, 300);
  }
}

// Hàm hiển thị toast thông báo
function showToast(message, type = 'info') {
  // Tạo toast element nếu chưa có
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'position-fixed top-0 start-50 translate-middle-x p-3';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);
  }
  
  const toastId = 'toast-' + Date.now();
  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">${message}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;
  
  toastContainer.insertAdjacentHTML('beforeend', toastHtml);
  
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement);
  toast.show();
  
  // Tự động xóa toast sau khi ẩn
  toastElement.addEventListener('hidden.bs.toast', () => {
    toastElement.remove();
  });
}

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
      saveCarListToStorage(false);
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
  saveCarListToStorage(false);
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

  // Đếm số lượng xe theo mã xe (chỉ đếm xe chưa được ấn vào)
  const countByCode = {};
  carList.forEach(car => {
    if (!car.done) { // Chỉ đếm xe chưa được ấn vào (chưa có done = true)
      countByCode[car.carCode] = (countByCode[car.carCode] || 0) + 1;
    }
  });

  carList.forEach((car, index) => {
    // Dòng chính
    const row = tbody.insertRow();

    // Toggle chọn dòng khi click nền dòng (bỏ qua click vào các nút bên trong)
    row.addEventListener('click', function(e) {
      if (!multiSelectMode) return;
      const target = e.target;
      if (target.closest('button') || target.closest('input') || target.closest('a') || target.closest('.btn')) {
        return;
      }
      handleRowClick(car.id, row);
    });

    // Kiểm tra trạng thái để set class
    if (car.isNullTime) {
      row.classList.add('null-time-done');
    } else if (car.done) {
      row.classList.add('done');
    } else if (getRemainingTimeInMillis(car.timeIn, car) <= 0) {
      row.classList.add('overdue');
    }
    // Nếu mã xe bị trùng VÀ xe chưa được ấn vào, thêm class duplicate-done
    if (!car.done && countByCode[car.carCode] >= 2) {
      row.classList.add('duplicate-done');
    }
    // Nếu đang được chọn
    if (selectedIds.has(car.id)) {
      row.classList.add('row-selected');
    }

    // Số thứ tự
    const cell1 = row.insertCell(0);
    cell1.textContent = index + 1;

    // Trạng thái
    const cell2 = row.insertCell(1);
    // Nút trạng thái: 'C' (vàng) hoặc 'R' (xanh) + nút Đổi cùng hàng
    const isPaid = car.paid;
    let statusHtml = `<button class="btn btn-status btn-sm ${isPaid ? 'btn-success' : 'btn-warning'}" onclick="togglePaid(${index})">${isPaid ? 'R' : 'C'}</button>`;
    statusHtml += ` <button class="btn btn-secondary btn-sm" onclick="changeCarCode(${index})">Đổi</button>`;
    if (car.note) {
      statusHtml += ` <span class='car-note'>${car.note}</span>`;
    }
    cell2.innerHTML = statusHtml;

    // Mã xe mới + các mã xe cũ (nếu có)
    const cell3 = row.insertCell(2);
    let carCodeHtml = `<span style="font-size: 1.2em; font-weight: bold;">${car.carCode}</span>`;
    if (car.oldCarCodes && car.oldCarCodes.length > 0) {
      carCodeHtml += ` <span class='old-car-code-italic'>(` + car.oldCarCodes.map(code => `${code}`).join(', ') + `)</span>`;
    }
    cell3.innerHTML = carCodeHtml;

    // Thời gian ra và vào (hiển thị cả hai) - định dạng 12h không có AM/PM
    const cell4 = row.insertCell(3);
    const timeOutFormatted = car.timeOut.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    }).replace(/[AP]M/g, '').trim();
    const timeInFormatted = car.timeIn.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    }).replace(/[AP]M/g, '').trim();
    cell4.innerHTML = `<div><span style='font-size:0.95em;'><b>${timeOutFormatted}</b></span><br><span style='font-size:0.9em;color:#2196f3;'><b>${timeInFormatted}</b></span></div>`;

    // Thời gian còn lại (hiển thị đếm ngược)
    const cell5 = row.insertCell(4);
    const remainingTime = getRemainingTime(car.timeIn, car);
    cell5.innerHTML = `<span class="countdown">${remainingTime}</span>`;

    // Action buttons (các nút)
    const cell6 = row.insertCell(5); // Đây là cột thứ 6 (index 5)
    cell6.innerHTML = `
      <button class="btn btn-success btn-sm" onclick="toggleDone(${index})">${car.done ? 'Res' : 'Vào'}</button>
      <button class='btn btn-secondary btn-sm' onclick='openRowActionModal(${index})'>...</button>
    `;

    // Không render dòng phụ nữa
  });

  // Thêm dòng xe ảo để tạo khoảng trống tránh bị bottom bar che
  const spacerRow = tbody.insertRow();
  spacerRow.classList.add('spacer-row');
  spacerRow.style.height = '100px'; // Chiều cao đủ để tạo khoảng trống
  
  // Tạo các ô trống
  for (let i = 0; i < 6; i++) {
    const spacerCell = spacerRow.insertCell(i);
    spacerCell.innerHTML = '&nbsp;'; // Nội dung trống
    spacerCell.style.border = 'none';
    spacerCell.style.background = 'transparent';
  }

  // Cập nhật thanh chọn nhiều
  updateSelectionBar();

  // setTimeout(updateCountdowns, 1000); // BỎ, sẽ gọi ở ngoài
}

// Đếm ngược thời gian
function getRemainingTime(timeIn, car) {
  if (car && car.isNullTime) {
    if (!car.timeOut) return '00:00';
    const now = Date.now();
    const elapsed = Math.floor((now - new Date(car.timeOut).getTime()) / 1000); // Thời gian đã trôi qua từ timeOut
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
        row.classList.remove('done', 'overdue', 'null-time-done', 'row-selected');
        const car = carList[i];
        if (car.isNullTime) {
          row.classList.add('null-time-done');
        } else if (car.done) {
          row.classList.add('done');
        } else if (getRemainingTimeInMillis(car.timeIn, car) <= 0) {
          row.classList.add('overdue');
        }
        if (selectedIds.has(car.id)) {
          row.classList.add('row-selected');
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
  saveCarListToStorage(false);
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
  saveCarListToStorage(false);
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
    saveCarListToStorage(false); // Cập nhật lên database khi thoát chế độ null
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
      btn.textContent = car.done ? 'Res' : 'Vào';
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
  saveCarListToStorage(false);
}

// Xóa xe khỏi danh sách
function deleteCar(index) {
  if (!confirm('Bạn có chắc chắn muốn xóa dòng này?')) return;
  
  carList.splice(index, 1);
  saveCarListToStorage(false);
  // renderCarList(); // BỎ
}

// Chọn/bỏ chọn dòng theo click
function handleRowClick(carId, rowEl) {
  if (!multiSelectMode) return;
  if (selectedIds.has(carId)) {
    selectedIds.delete(carId);
    if (rowEl) rowEl.classList.remove('row-selected');
  } else {
    selectedIds.add(carId);
    if (rowEl) rowEl.classList.add('row-selected');
  }
  updateSelectionBar();
}

// Chọn tất cả dòng hiện có
function selectAllRows() {
  carList.forEach(c => selectedIds.add(c.id));
  renderCarList();
  updateSelectionBar();
}

// Bỏ chọn tất cả
function clearSelection() {
  selectedIds.clear();
  renderCarList();
  // Tắt luôn chế độ chọn dòng khi bấm Bỏ chọn
  multiSelectMode = false;
  const table = document.getElementById('car-list');
  if (table) table.classList.remove('select-mode');
  updateSelectionBar();
}

// Xóa các dòng đã chọn
function deleteSelectedRows() {
  if (selectedIds.size === 0) return;
  if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} dòng đã chọn?`)) return;
  carList = carList.filter(c => !selectedIds.has(c.id));
  selectedIds.clear();
  saveCarListToStorage(false);
  renderCarList();
  updateSelectionBar();
  showToast('Đã xóa các dòng đã chọn!', 'success');
  // Tự tắt chế độ chọn nhiều sau khi xóa
  multiSelectMode = false;
  const table = document.getElementById('car-list');
  if (table) table.classList.remove('select-mode');
  updateSelectionBar();
}

// Cập nhật thanh tác vụ chọn nhiều
function updateSelectionBar() {
  const bar = document.getElementById('selectionBar');
  const countEl = document.getElementById('selectionCount');
  const deleteBtn = document.getElementById('selectionDeleteBtn');
  const timeBtn = document.getElementById('selectionTimeBtn');
  const noteBtn = document.getElementById('selectionNoteBtn');
  if (!bar || !countEl || !deleteBtn) return;
  if (!multiSelectMode) {
    bar.style.display = 'none';
    deleteBtn.disabled = true;
    if (timeBtn) timeBtn.disabled = true;
    if (noteBtn) noteBtn.disabled = true;
    const table = document.getElementById('car-list');
    if (table) table.classList.remove('select-mode');
    return;
  }
  const count = selectedIds.size;
  countEl.textContent = count;
  if (count > 0) {
    bar.style.display = 'flex';
    deleteBtn.disabled = false;
    if (timeBtn) timeBtn.disabled = false;
    if (noteBtn) noteBtn.disabled = false;
  } else {
    bar.style.display = 'none';
    deleteBtn.disabled = true;
    if (timeBtn) timeBtn.disabled = true;
    if (noteBtn) noteBtn.disabled = true;
  }
}

// --- Chức năng chỉnh thời gian nhiều xe ---
function editTimeForSelectedCars() {
  if (selectedIds.size === 0) return;
  
  const multiTimeModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('multiTimeModal'));
  const countEl = document.getElementById('multiTimeCount');
  if (countEl) countEl.textContent = selectedIds.size;
  
  multiTimeModal.show();
}

function changeMultiTime(deltaMinutes) {
  if (selectedIds.size === 0) return;
  
  let changedCount = 0;
  selectedIds.forEach(id => {
    const index = carList.findIndex(car => car.id === id);
    if (index !== -1) {
      const car = carList[index];
      if (car.isNullTime) car.isNullTime = false; // Bỏ null khi chỉnh lại
      
      const newTimeIn = new Date(car.timeIn);
      newTimeIn.setMinutes(newTimeIn.getMinutes() + deltaMinutes);
      
      // Kiểm tra nếu thời gian vào không được phép nhỏ hơn thời gian ra
      if (newTimeIn >= car.timeOut) {
        car.timeIn = newTimeIn;
        changedCount++;
      }
    }
  });
  
  if (changedCount > 0) {
    saveCarListToStorage(false);
    renderCarList();
    showToast(`Đã chỉnh thời gian cho ${changedCount} xe!`, 'success');
  } else {
    showToast('Không thể chỉnh thời gian vì thời gian vào sẽ nhỏ hơn thời gian ra!', 'warning');
  }
}

function setMultiTimeNull() {
  if (selectedIds.size === 0) return;
  
  selectedIds.forEach(id => {
    const index = carList.findIndex(car => car.id === id);
    if (index !== -1) {
      carList[index].isNullTime = true;
    }
  });
  
  saveCarListToStorage(false);
  renderCarList();
  showToast(`Đã đặt Null cho ${selectedIds.size} xe!`, 'success');
}

// --- Chức năng ghi chú nhiều xe ---
function editNoteForSelectedCars() {
  if (selectedIds.size === 0) return;
  
  const multiNoteModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('multiNoteModal'));
  const countEl = document.getElementById('multiNoteCount');
  const noteInput = document.getElementById('multiNoteInput');
  
  if (countEl) countEl.textContent = selectedIds.size;
  if (noteInput) noteInput.value = '';
  
  multiNoteModal.show();
}

function applyMultiNote() {
  if (selectedIds.size === 0) return;
  
  const noteInput = document.getElementById('multiNoteInput');
  if (!noteInput) return;
  
  const note = noteInput.value.trim();
  let changedCount = 0;
  
  selectedIds.forEach(id => {
    const index = carList.findIndex(car => car.id === id);
    if (index !== -1) {
      carList[index].note = note;
      changedCount++;
    }
  });
  
  saveCarListToStorage(false);
  renderCarList();
  showToast(`Đã cập nhật ghi chú cho ${changedCount} xe!`, 'success');
  
  // Đóng modal
  const multiNoteModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('multiNoteModal'));
  multiNoteModal.hide();
}

// --- Lưu trữ Firebase Realtime Database ---
function saveCarListToStorage(skipHistory = false) {
  // Lưu trạng thái vào lịch sử trước khi thay đổi (nếu không skip)
  if (!skipHistory) {
    saveToHistory();
  }
  
  // Chuyển Date thành string ISO để lưu, pausedAt và nullStartTime giữ nguyên kiểu số hoặc undefined
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
    // nullStartTime chỉ lưu nếu là số, nếu undefined thì bỏ
    if (typeof car.nullStartTime === 'number') {
      obj.nullStartTime = car.nullStartTime;
    } else {
      delete obj.nullStartTime;
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
        // nullStartTime phải là số hoặc undefined
        if (typeof car.nullStartTime === 'number') {
          obj.nullStartTime = car.nullStartTime;
        } else if (typeof car.nullStartTime === 'string' && car.nullStartTime !== '') {
          obj.nullStartTime = Number(car.nullStartTime);
        } else {
          obj.nullStartTime = undefined;
        }
        return obj;
      });
    } else {
      carList = [];
    }
    renderCarList();
    
    // Lưu trạng thái sau khi load dữ liệu từ Firebase (chỉ khi khởi tạo)
    if (!window.initialLoadComplete) {
      window.initialLoadComplete = true;
      setTimeout(() => {
        // Lưu trạng thái ban đầu mà không kiểm tra trùng lặp
        const currentState = JSON.stringify(carList.map(car => ({
          ...car,
          timeOut: car.timeOut.toISOString(),
          timeIn: car.timeIn.toISOString()
        })));
        undoHistory.push(currentState);
      }, 100);
    }
  });
  const idCounter = localStorage.getItem('carIdCounter');
  if (idCounter) carIdCounter = Number(idCounter);
}

// Gọi khi trang load
loadCarListFromStorage();
loadSettings();
renderCarList();
updateCountdowns();



// Xóa dữ liệu xe tạm thời cũ nếu có
localStorage.removeItem('tempCars');

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
      saveCarListToStorage(false);
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
const minusXBtn = document.getElementById('minusXBtn');
const plusXBtn = document.getElementById('plusXBtn');

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
  saveCarListToStorage(false);
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
    saveCarListToStorage(false);
    // renderCarList(); // BỎ
    if (timeModal) timeModal.hide();
  };
}
if (minusXBtn) {
  minusXBtn.onclick = () => {
    changeTimeByDelta(-xStepMinutes);
  };
}
if (plusXBtn) {
  plusXBtn.onclick = () => {
    changeTimeByDelta(xStepMinutes);
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
        saveCarListToStorage(false);
        // renderCarList(); // BỎ
      }
    }
    if (rowActionModal) rowActionModal.hide();
  };
}

// --- Cài đặt ---
const settingsBtn = document.getElementById('settingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const exportCarsBtn = document.getElementById('exportCarsBtn');
const settingsModalEl = document.getElementById('settingsModal');
const defaultMinutesInput = document.getElementById('defaultMinutesInput');
const defaultSecondsInput = document.getElementById('defaultSecondsInput');
const xStepMinutesInput = document.getElementById('xStepMinutesInput');
const activateMultiSelectBtn = document.getElementById('activateMultiSelectBtn');
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

// Kích hoạt chế độ chọn dòng một lần
if (activateMultiSelectBtn) {
  activateMultiSelectBtn.addEventListener('click', function() {
    multiSelectMode = true;
    selectedIds.clear();
    updateSelectionBar();
    renderCarList();
    const table = document.getElementById('car-list');
    if (table) table.classList.add('select-mode');
    if (settingsModal) settingsModal.hide();
    showToast('Đã bật chế độ chọn dòng. Chạm vào dòng để chọn/xóa.', 'info');
  });
}

// Event listener cho nút xuất danh sách xe
if (exportCarsBtn) {
  exportCarsBtn.addEventListener('click', function() {
    exportCarList();
  });
}
if (defaultMinutesInput) {
  defaultMinutesInput.addEventListener('input', updateDefaultTimeDisplay);
}
if (defaultSecondsInput) {
  defaultSecondsInput.addEventListener('input', updateDefaultTimeDisplay);
}
if (xStepMinutesInput) {
  xStepMinutesInput.addEventListener('input', function() {
    const val = Number(xStepMinutesInput.value);
    if (!Number.isNaN(val) && val > 0) {
      xStepMinutes = val;
    }
  });
}

function loadSettings() {
  const savedDefaultTime = localStorage.getItem('defaultTimeMinutes');
  const savedDefaultSeconds = localStorage.getItem('defaultTimeSeconds');
  const savedXStep = localStorage.getItem('xStepMinutes');
  if (savedDefaultTime) {
    defaultTimeMinutes = Number(savedDefaultTime);
  }
  if (savedDefaultSeconds) {
    defaultTimeSeconds = Number(savedDefaultSeconds);
  }
  if (savedXStep) {
    xStepMinutes = Number(savedXStep);
  }
  const defaultMinutesInput = document.getElementById('defaultMinutesInput');
  const defaultSecondsInput = document.getElementById('defaultSecondsInput');
  const defaultTimeDisplay = document.getElementById('defaultTimeDisplay');
  const xStepMinutesInput = document.getElementById('xStepMinutesInput');
  if (defaultMinutesInput) {
    defaultMinutesInput.value = defaultTimeMinutes;
  }
  if (defaultSecondsInput) {
    defaultSecondsInput.value = defaultTimeSeconds;
  }
  if (defaultTimeDisplay) {
    defaultTimeDisplay.textContent = `${String(defaultTimeMinutes).padStart(2, '0')}:${String(defaultTimeSeconds).padStart(2, '0')}`;
  }
  if (xStepMinutesInput) {
    xStepMinutesInput.value = xStepMinutes;
  }
}

function saveSettings() {
  const defaultMinutesInput = document.getElementById('defaultMinutesInput');
  const defaultSecondsInput = document.getElementById('defaultSecondsInput');
  const xStepMinutesInput = document.getElementById('xStepMinutesInput');
  if (defaultMinutesInput) {
    defaultTimeMinutes = Number(defaultMinutesInput.value);
    localStorage.setItem('defaultTimeMinutes', defaultTimeMinutes);
  }
  if (defaultSecondsInput) {
    defaultTimeSeconds = Number(defaultSecondsInput.value);
    localStorage.setItem('defaultTimeSeconds', defaultTimeSeconds);
  }
  if (xStepMinutesInput) {
    xStepMinutes = Math.max(1, Number(xStepMinutesInput.value) || xStepMinutes);
    localStorage.setItem('xStepMinutes', xStepMinutes);
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

// Hàm xuất danh sách xe
function exportCarList() {
  if (carList.length === 0) {
    showToast('Không có xe nào để xuất!', 'warning');
    return;
  }

  // Tạo nội dung để xuất
  let exportContent = '=== DANH SÁCH XE HIỆN TẠI ===\n';
  exportContent += `Thời gian xuất: ${new Date().toLocaleString('vi-VN')}\n`;
  exportContent += `Tổng số xe: ${carList.length}\n\n`;

  carList.forEach((car, index) => {
    exportContent += `--- Xe ${index + 1} ---\n`;
    exportContent += `ID: ${car.id}\n`;
    exportContent += `Mã xe: ${car.carCode}\n`;
    exportContent += `Thời gian ra: ${car.timeOut.toLocaleString('vi-VN')}\n`;
    exportContent += `Thời gian vào: ${car.timeIn.toLocaleString('vi-VN')}\n`;
    exportContent += `Trạng thái thanh toán: ${car.paid ? 'Đã thanh toán (R)' : 'Chưa thanh toán (C)'}\n`;
    exportContent += `Trạng thái: ${car.done ? 'Đã hoàn thành' : 'Đang chạy'}\n`;
    
    if (car.oldCarCodes && car.oldCarCodes.length > 0) {
      exportContent += `Mã xe cũ: ${car.oldCarCodes.join(', ')}\n`;
    }
    
    if (car.note) {
      exportContent += `Ghi chú: ${car.note}\n`;
    }
    
    if (car.isNullTime) {
      exportContent += `Chế độ: Null time\n`;
    }
    
    exportContent += '\n';
  });

  // Tạo file để download
  const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `danh_sach_xe_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Đã xuất danh sách xe thành công!', 'success');
}

// Khi mở modal chọn xe, cập nhật menu xe từ car menu editor
const carModalEl = document.getElementById('carModal');
if (carModalEl) {
  carModalEl.addEventListener('show.bs.modal', function() {
    // Cập nhật menu xe từ car menu editor
    if (window.carMenuEditor) {
      window.carMenuEditor.updateMainMenu();
    }
  });
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
    const ctx = new (window.AudioContext || window.webkit.AudioContext)();
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

// --- Event listener cho nút Back và phím tắt Ctrl+Z ---
const backBtn = document.getElementById('backBtn');
if (backBtn) {
  backBtn.addEventListener('click', function(e) {
    e.preventDefault(); // Ngăn chặn sự kiện mặc định
    e.stopPropagation(); // Ngăn chặn event bubbling
    undo();
  });
}

// Phím tắt Ctrl+Z để undo
document.addEventListener('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault(); // Ngăn chặn hành vi mặc định của trình duyệt
    e.stopPropagation(); // Ngăn chặn event bubbling
    undo();
  }
});

// --- Car Menu Editor Event Listeners ---
document.addEventListener('DOMContentLoaded', function() {
  // Mở car menu editor
  const openCarMenuEditorBtn = document.getElementById('openCarMenuEditorBtn');
  if (openCarMenuEditorBtn) {
    openCarMenuEditorBtn.addEventListener('click', function() {
      if (window.carMenuEditor) {
        window.carMenuEditor.renderEditor();
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('carMenuEditorModal'));
        modal.show();
      }
    });
  }

  // Reset car menu về mặc định
  const resetCarMenuBtn = document.getElementById('resetCarMenuBtn');
  if (resetCarMenuBtn) {
    resetCarMenuBtn.addEventListener('click', function() {
      if (confirm('Bạn có chắc chắn muốn reset menu xe về mặc định? Tất cả thay đổi sẽ bị mất.')) {
        if (window.carMenuEditor) {
          window.carMenuEditor.resetToDefault();
          showToast('Đã reset menu xe về mặc định!', 'success');
        }
      }
    });
  }

  // Áp dụng thay đổi car menu
  const applyCarMenuChangesBtn = document.getElementById('applyCarMenuChangesBtn');
  if (applyCarMenuChangesBtn) {
    applyCarMenuChangesBtn.addEventListener('click', function() {
      if (window.carMenuEditor) {
        window.carMenuEditor.updateMainMenu();
        const modal = bootstrap.Modal.getInstance(document.getElementById('carMenuEditorModal'));
        if (modal) modal.hide();
        showToast('Đã áp dụng thay đổi menu xe!', 'success');
      }
    });
  }

  // Fullscreen functionality
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', function() {
      toggleFullscreen();
    });
  }
});

// Hàm chuyển đổi toàn màn hình
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    // Vào chế độ toàn màn hình
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    }
  } else {
    // Thoát chế độ toàn màn hình
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}

// Lắng nghe sự kiện thay đổi toàn màn hình để cập nhật icon
document.addEventListener('fullscreenchange', updateFullscreenIcon);
document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);
document.addEventListener('msfullscreenchange', updateFullscreenIcon);

function updateFullscreenIcon() {
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  if (!fullscreenBtn) return;

  if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
    // Đang ở chế độ toàn màn hình - hiển thị icon thoát
    fullscreenBtn.innerHTML = `
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M5.5 0a.5.5 0 0 1 .5.5v4A1.5 1.5 0 0 1 4.5 6h-4a.5.5 0 0 1 0-1h3.5a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h3.5a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 10 4.5v-4a.5.5 0 0 1 .5-.5zM0 10.5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 6 11.5v4a.5.5 0 0 1-1 0v-3.5a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zm10 1a1.5 1.5 0 0 1 1.5-1.5h3.5a.5.5 0 0 1 0 1h-4a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4z"/>
      </svg>
    `;
    fullscreenBtn.title = 'Thoát toàn màn hình';
  } else {
    // Không ở chế độ toàn màn hình - hiển thị icon vào
    fullscreenBtn.innerHTML = `
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-.5.5h-1a.5.5 0 0 0 0 1H1v1a.5.5 0 0 0 1 0V7h1a.5.5 0 0 0 0-1H1V1.5a.5.5 0 0 0-.5-.5z"/>
        <path d="M14.5 1a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h1a.5.5 0 0 1 0 1H16v1a.5.5 0 0 1-1 0V7h-1a.5.5 0 0 1 0-1h1V1.5a.5.5 0 0 1 .5-.5z"/>
      </svg>
    `;
    fullscreenBtn.title = 'Toàn màn hình';
  }
}