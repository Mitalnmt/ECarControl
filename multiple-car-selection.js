// Multiple Car Selection - Chọn nhiều xe cùng lúc
class MultipleCarSelection {
  constructor() {
    this.selectedCars = new Set(); // Lưu các xe đã chọn
    this.carGroups = []; // Lưu cấu hình menu xe từ car menu editor
    this.groupColorPalette = ['#1e88e5', '#d81b60', '#43a047', '#8e24aa', '#fb8c00', '#00897b', '#5e35b1', '#f4511e'];
    this.nextGroupColorIndex = 0;
    this.init();
  }

  init() {
    this.loadCarGroups();
    this.setupEventListeners();
  }

  // Lấy cấu hình menu xe từ car menu editor
  loadCarGroups() {
    if (window.carMenuEditor && window.carMenuEditor.carGroups) {
      this.carGroups = window.carMenuEditor.carGroups;
    } else {
      // Fallback về cấu hình mặc định nếu chưa có car menu editor
      this.carGroups = [
        {
          name: 'Nhóm A',
          cars: ['A1', 'A12', 'A13', 'A14', 'A15', 'A16', 'A17', 'A18', 'A19', 'A20', 'AB']
        },
        {
          name: 'Nhóm C', 
          cars: ['C1', 'C2', 'C3', 'C4', 'CC', 'CX']
        },
        {
          name: 'Nhóm M',
          cars: ['M1', 'M2', 'M3', 'D3']
        },
        {
          name: 'Nhóm X',
          cars: ['XĐ', 'XT', 'XV']
        },
        {
          name: 'Nhóm S',
          cars: ['S1', 'S2', 'S3', 'S4']
        },
        {
          name: 'Nhóm số',
          cars: ['03', '06', '09', '10', '25']
        },
        {
          name: 'Nhóm đặc biệt',
          cars: ['ĐM', 'ĐC', 'VH']
        }
      ];
    }
  }

  // Thiết lập event listeners
  setupEventListeners() {
    // Nút thêm xe đã chọn
    const addSelectedCarsBtn = document.getElementById('addSelectedCarsBtn');
    if (addSelectedCarsBtn) {
      addSelectedCarsBtn.addEventListener('click', () => this.addSelectedCars());
    }

    // Khi mở modal chọn nhiều xe
    const selectMultipleModal = document.getElementById('selectMultipleModal');
    if (selectMultipleModal) {
      selectMultipleModal.addEventListener('show.bs.modal', () => {
        this.onModalOpen();
      });
    }
  }

  // Khi mở modal
  onModalOpen() {
    this.loadCarGroups(); // Cập nhật lại cấu hình menu xe
    this.selectedCars.clear(); // Reset danh sách chọn
    this.renderSelectionInterface();
    this.updateSelectedCount();
  }

  // Render giao diện chọn xe (giống menu cũ)
  renderSelectionInterface() {
    const container = document.getElementById('multipleCarSelectionContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="mb-2">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span>Đã chọn: <span id="selectedCount">0</span> xe</span>
          <div>
            <button class="btn btn-sm btn-outline-primary" onclick="multipleCarSelection.selectAllCars()">Chọn tất cả</button>
            <button class="btn btn-sm btn-outline-secondary" onclick="multipleCarSelection.clearAllSelection()">Bỏ chọn tất cả</button>
          </div>
        </div>
      </div>
      ${this.carGroups.map((group, groupIndex) => this.renderGroup(group, groupIndex)).join('')}
      ${this.carGroups.length === 0 ? '<p class="text-muted text-center">Chưa có nhóm xe nào.</p>' : ''}
    `;
  }

  // Render một nhóm xe (giống menu cũ)
  renderGroup(group, groupIndex) {
    return `
      <div class="mb-2">
        ${group.cars.map((car, carIndex) => this.renderCar(car, groupIndex, carIndex)).join('')}
      </div>
    `;
  }

  // Render một xe (giống menu cũ nhưng có checkbox)
  renderCar(car, groupIndex, carIndex) {
    const isSelected = this.selectedCars.has(car);
    return `
      <button class="btn ${isSelected ? 'btn-primary' : 'btn-secondary'} m-1" 
              onclick="multipleCarSelection.toggleCarSelection('${car}')"
              data-car-code="${car}">
        ${car}
      </button>
    `;
  }

  // Toggle chọn/bỏ chọn một xe
  toggleCarSelection(carCode) {
    const button = document.querySelector(`button[data-car-code="${carCode}"]`);
    
    if (this.selectedCars.has(carCode)) {
      this.selectedCars.delete(carCode);
      if (button) {
        button.classList.remove('btn-primary');
        button.classList.add('btn-secondary');
      }
    } else {
      this.selectedCars.add(carCode);
      if (button) {
        button.classList.remove('btn-secondary');
        button.classList.add('btn-primary');
      }
    }
    
    this.updateSelectedCount();
  }

  // Chọn tất cả xe
  selectAllCars() {
    this.carGroups.forEach((group, groupIndex) => {
      group.cars.forEach((car, carIndex) => {
        if (!this.selectedCars.has(car)) {
          this.selectedCars.add(car);
          const button = document.querySelector(`button[data-car-code="${car}"]`);
          if (button) {
            button.classList.remove('btn-secondary');
            button.classList.add('btn-primary');
          }
        }
      });
    });

    this.updateSelectedCount();
  }

  // Bỏ chọn tất cả xe
  clearAllSelection() {
    this.selectedCars.clear();
    
    // Reset tất cả button về trạng thái không chọn
    const buttons = document.querySelectorAll('button[data-car-code]');
    buttons.forEach(button => {
      button.classList.remove('btn-primary');
      button.classList.add('btn-secondary');
    });

    this.updateSelectedCount();
  }

  // Cập nhật số lượng xe đã chọn
  updateSelectedCount() {
    const selectedCountElement = document.getElementById('selectedCount');
    if (selectedCountElement) {
      selectedCountElement.textContent = this.selectedCars.size;
    }
  }

  // Thêm các xe đã chọn vào danh sách
  addSelectedCars() {
    if (this.selectedCars.size === 0) {
      if (typeof showToast === 'function') {
        showToast('Vui lòng chọn ít nhất một xe!', 'warning');
      }
      return;
    }

    let applyGroupColor = false;
    if (this.selectedCars.size > 1) {
      applyGroupColor = confirm('Các xe này đi chung với nhau?');
    }

    let colorForGroup;
    if (applyGroupColor) {
      colorForGroup = this.groupColorPalette[this.nextGroupColorIndex % this.groupColorPalette.length];
      this.nextGroupColorIndex++;
    }

    // Thêm từng xe đã chọn, kèm màu nhóm nếu có
    this.selectedCars.forEach(carCode => {
      if (typeof addCar === 'function') {
        addCar(carCode, { groupColor: colorForGroup });
      }
    });

    // Đóng modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('selectMultipleModal'));
    if (modal) {
      modal.hide();
    }

    // Hiển thị thông báo
    if (typeof showToast === 'function') {
      showToast(`Đã thêm ${this.selectedCars.size} xe vào danh sách!`, 'success');
    }

    // Reset selection
    this.selectedCars.clear();
  }
}

// Khởi tạo multiple car selection khi trang load
let multipleCarSelection;
document.addEventListener('DOMContentLoaded', function() {
  multipleCarSelection = new MultipleCarSelection();
  window.multipleCarSelection = multipleCarSelection; // Để có thể truy cập từ script.js
}); 