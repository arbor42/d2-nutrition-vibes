// Searchable Select Component
class SearchableSelect {
    constructor(searchInputId, selectId, options = []) {
        this.searchInput = document.getElementById(searchInputId);
        this.select = document.getElementById(selectId);
        this.options = options;
        this.filteredOptions = [...options];
        this.isOpen = false;
        this.highlightedIndex = -1;
        this.selectedValue = '';
        
        this.init();
    }
    
    init() {
        if (!this.searchInput || !this.select) return;
        
        // Hide the original select and search input
        this.select.style.display = 'none';
        this.searchInput.style.display = 'none';
        
        // Create custom dropdown structure
        this.createCustomDropdown();
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.closeDropdown();
            }
        });
    }
    
    createCustomDropdown() {
        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'custom-searchable-select';
        
        // Create display button (shows current value)
        this.displayButton = document.createElement('button');
        this.displayButton.className = 'searchable-display';
        this.displayButton.type = 'button';
        this.displayButton.textContent = 'Wählen...';
        
        // Create dropdown container
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'searchable-dropdown';
        this.dropdown.style.display = 'none';
        
        // Create search input inside dropdown
        this.dropdownSearch = document.createElement('input');
        this.dropdownSearch.type = 'text';
        this.dropdownSearch.className = 'searchable-dropdown-search';
        this.dropdownSearch.placeholder = 'Suchen...';
        
        // Create options list
        this.optionsList = document.createElement('ul');
        this.optionsList.className = 'searchable-options';
        
        // Assemble dropdown structure
        this.dropdown.appendChild(this.dropdownSearch);
        this.dropdown.appendChild(this.optionsList);
        
        // Assemble main structure
        this.container.appendChild(this.displayButton);
        this.container.appendChild(this.dropdown);
        
        // Insert after the original search input
        this.searchInput.parentNode.insertBefore(this.container, this.searchInput);
        
        // Add event listeners
        this.displayButton.addEventListener('click', () => {
            this.toggleDropdown();
        });
        
        this.dropdownSearch.addEventListener('input', (e) => {
            this.filterOptions(e.target.value);
        });
        
        this.dropdownSearch.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });
    }
    
    updateOptions(options) {
        this.options = options;
        this.filteredOptions = [...options];
        this.populateDropdown();
        this.updateSelect();
    }
    
    filterOptions(searchTerm) {
        const term = searchTerm.toLowerCase();
        this.filteredOptions = this.options.filter(option => 
            this.getOptionText(option.value || option).toLowerCase().includes(term)
        );
        this.highlightedIndex = this.filteredOptions.length > 0 ? 0 : -1;
        this.populateDropdown();
    }
    
    showAllOptions() {
        this.filteredOptions = [...this.options];
        this.highlightedIndex = -1;
        this.populateDropdown();
    }
    
    populateDropdown() {
        this.optionsList.innerHTML = '';
        
        this.filteredOptions.forEach((option, index) => {
            const li = document.createElement('li');
            li.className = 'searchable-option';
            li.textContent = option.text || option;
            li.dataset.value = option.value || option;
            
            // Highlight closest match (first item when filtering)
            if (index === this.highlightedIndex) {
                li.classList.add('highlighted');
            }
            
            li.addEventListener('click', () => {
                this.selectOption(option.value || option);
            });
            
            this.optionsList.appendChild(li);
        });
    }
    
    updateSelect() {
        // Update the hidden select to match all options
        this.select.innerHTML = '';
        
        // Add placeholder option
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Wählen...';
        this.select.appendChild(placeholder);
        
        this.options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value || option;
            optionElement.textContent = option.text || option;
            this.select.appendChild(optionElement);
        });
    }
    
    toggleDropdown() {
        if (this.isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }
    
    handleKeydown(e) {
        if (!this.isOpen) return;
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.filteredOptions.length - 1);
                this.updateHighlight();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
                this.updateHighlight();
                break;
            case 'Enter':
                e.preventDefault();
                if (this.highlightedIndex >= 0) {
                    this.selectOption(this.filteredOptions[this.highlightedIndex].value || this.filteredOptions[this.highlightedIndex]);
                }
                break;
            case 'Escape':
                this.closeDropdown();
                break;
        }
    }
    
    updateHighlight() {
        const options = this.optionsList.querySelectorAll('.searchable-option');
        options.forEach((option, index) => {
            if (index === this.highlightedIndex) {
                option.classList.add('highlighted');
            } else {
                option.classList.remove('highlighted');
            }
        });
    }
    
    openDropdown() {
        this.isOpen = true;
        this.dropdown.style.display = 'block';
        this.dropdownSearch.value = '';
        this.showAllOptions();
        this.dropdownSearch.focus();
    }
    
    closeDropdown() {
        this.isOpen = false;
        this.dropdown.style.display = 'none';
        this.highlightedIndex = -1;
    }
    
    selectOption(value) {
        this.selectedValue = value;
        this.select.value = value;
        this.displayButton.textContent = this.getOptionText(value);
        this.closeDropdown();
        
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        this.select.dispatchEvent(event);
    }
    
    getOptionText(value) {
        const option = this.options.find(opt => (opt.value || opt) === value);
        return option ? (option.text || option) : value;
    }
    
    setValue(value) {
        this.selectedValue = value;
        this.select.value = value;
        this.displayButton.textContent = this.getOptionText(value);
    }
    
    getValue() {
        return this.select.value;
    }
}

// Initialize searchable selects - will be called from main.js after data is loaded
function initializeSearchableSelects() {
    // Initialize country searchable select
    window.countrySearchableSelect = new SearchableSelect('country-search', 'country-select');
    
    // Initialize product searchable select
    window.productSearchableSelect = new SearchableSelect('product-search', 'product-select');
}

// Export for use in other modules
window.initializeSearchableSelects = initializeSearchableSelects;