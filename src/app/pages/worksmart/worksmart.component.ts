import { Component } from '@angular/core';

@Component({
  selector: 'app-worksmart',
  templateUrl: './worksmart.component.html',
  styleUrls: ['./worksmart.component.css']
})
export class WorkSmartComponent {
  isMenuOpen = false;
  
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  scrollToSection(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  }
}