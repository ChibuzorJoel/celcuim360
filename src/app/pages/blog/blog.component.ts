import { Component, OnInit, HostListener } from '@angular/core';

interface Article {
  id: number;
  title: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  imageUrl: string;
  excerpt: string;
  content: string[];
  featured: boolean;
}

@Component({
  selector: 'app-blog',
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.css']
})
export class BlogComponent implements OnInit {
  currentArticle: Article = {
    id: 1,
    title: 'Leading with Emotional Intelligence in Modern Workplaces',
    category: 'Leadership & Culture',
    author: 'Celcium360 Experts',
    date: 'March 14, 2024',
    readTime: '6 min read',
    imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80',
    excerpt: 'Discover how emotional intelligence transforms leadership effectiveness, fosters healthier workplace cultures, and drives sustainable organizational success.',
    content: [
      'In today\'s rapidly evolving workplace landscape, technical skills and industry knowledge are no longer sufficient for effective leadership. The most successful leaders are those who master the art of emotional intelligence—the ability to recognize, understand, and manage emotions in themselves and others.',
      'The modern workplace presents unique challenges that demand emotionally intelligent leadership. With hybrid work models, diverse teams, and constant change, leaders must navigate complex interpersonal dynamics while maintaining team cohesion and productivity.'
    ],
    featured: true
  };

  relatedArticles: Article[] = [
    {
      id: 2,
      title: 'Building Customer-Centric Organizations That Deliver Value',
      category: 'Customer Experience',
      author: 'Celcium360 Experts',
      date: 'March 14, 2024',
      readTime: '5 min read',
      imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      excerpt: 'Discover how to align your organization around customer needs to drive loyalty and sustainable growth.',
      content: [],
      featured: false
    },
    {
      id: 3,
      title: 'Unlocking Potential Through Mindset Transformation',
      category: 'Personal Growth',
      author: 'Celcium360 Experts',
      date: 'March 14, 2024',
      readTime: '4 min read',
      imageUrl: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      excerpt: 'Learn how shifting mindsets can unlock hidden potential and drive personal and professional growth.',
      content: [],
      featured: false
    },
    {
      id: 4,
      title: 'Creating High-Performance Teams in Hybrid Environments',
      category: 'Team Performance',
      author: 'Celcium360 Experts',
      date: 'March 14, 2024',
      readTime: '7 min read',
      imageUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
      excerpt: 'Strategies for building cohesive, productive teams when working across different locations and time zones.',
      content: [],
      featured: false
    }
  ];

  isHeaderScrolled = false;
  readingProgress = 0;

  ngOnInit() {
    this.calculateReadingTime();
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    // Header scroll effect
    this.isHeaderScrolled = window.scrollY > 100;

    // Reading progress
    const winHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset;
    this.readingProgress = (scrollTop / (docHeight - winHeight)) * 100;
  }

  calculateReadingTime() {
    const articleText = this.currentArticle.content.join(' ');
    const wordCount = articleText.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);
    this.currentArticle.readTime = `${readingTime} min read`;
  }

  shareArticle(platform: string) {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(this.currentArticle.title);
    
    let shareUrl = '';
    
    switch (platform) {
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${title}&url=${url}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(window.location.href);
        // Show success feedback (you could implement a toast notification)
        return;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  }

  navigateToArticle(articleId: number) {
    // In a real application, this would navigate to the specific article
    console.log('Navigating to article:', articleId);
    // this.router.navigate(['/blog', articleId]);
  }
}