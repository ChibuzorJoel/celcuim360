
 import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {

    
  constructor(private router: Router) { } // Inject the Angular Router

  ngOnInit(): void {
    // You can potentially move carousel initializations here if ngAfterViewInit fails
  }

  // Use this function on all internal links (routerLink) inside the collapsed menu
  closeMobileMenu(): void {
    // 1. Find the element that toggles the collapse (the hamburger icon button)
    const toggler = document.querySelector('.navbar-toggler');
    const collapseDiv = document.getElementById('navbarCollapse');

    // 2. Check if the menu is currently visible (Bootstrap uses the 'show' class)
    if (collapseDiv && collapseDiv.classList.contains('show')) {
      // 3. Force a click on the toggler button to hide the menu
      if (toggler) {
        (toggler as HTMLElement).click();
      }
    }
    
    // NOTE: For the dropdown items, the link navigation (routerLink) will happen automatically
    // after this function runs.
  }
}