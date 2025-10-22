
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
    const navbarEl = document.getElementById('navbarCollapse');
    if (navbarEl) {
      this.bsCollapse = new bootstrap.Collapse(navbarEl, { toggle: false });
    }
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