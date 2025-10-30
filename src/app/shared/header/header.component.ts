import { Component, OnInit } from '@angular/core';
declare var bootstrap: any;

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  private bsCollapse: any;

  ngOnInit(): void {
    // Initialize navbar collapse
    const navbarEl = document.getElementById('navbarCollapse');
    if (navbarEl) {
      this.bsCollapse = new bootstrap.Collapse(navbarEl, { toggle: false });
    }

    // Initialize all dropdowns
    const dropdownElList = Array.from(document.querySelectorAll('.dropdown-toggle'));
    dropdownElList.forEach((dropdownToggleEl: any) => {
      new bootstrap.Dropdown(dropdownToggleEl);
    });
  }

  toggleMobileMenu() {
    if (this.bsCollapse) {
      this.bsCollapse.toggle();
    }
  }

  closeMobileMenu() {
    if (this.bsCollapse) {
      this.bsCollapse.hide();
    }
  }
}
