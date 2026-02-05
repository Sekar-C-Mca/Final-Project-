import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { 
    Shield, 
    Zap, 
    BarChart3, 
    Users, 
    CheckCircle, 
    ArrowRight, 
    Play,
    FileCode,
    Brain,
    Target,
    TrendingUp,
    Award,
    Timer,
    Star
} from 'lucide-react';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import './LandingPage.css';

gsap.registerPlugin(ScrollTrigger);

const LandingPage = () => {
    const heroRef = useRef();
    const featuresRef = useRef();
    const statsRef = useRef();

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Hero animations
            gsap.timeline()
                .fromTo(
                    '.hero-content h1',
                    { y: 50, opacity: 0 },
                    { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }
                )
                .fromTo(
                    '.hero-subtitle',
                    { y: 30, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' },
                    '-=0.5'
                )
                .fromTo(
                    '.hero-buttons',
                    { y: 30, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' },
                    '-=0.3'
                )
                .fromTo(
                    '.hero-badges',
                    { y: 20, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' },
                    '-=0.3'
                );

            // Mockup animations
            gsap.fromTo(
                '.dashboard-mockup',
                { y: 80, opacity: 0, rotation: 5 },
                { 
                    y: 0, 
                    opacity: 1, 
                    rotation: 0, 
                    duration: 1.2, 
                    ease: 'power3.out',
                    delay: 0.5
                }
            );

            // Chart bars animation
            gsap.fromTo(
                '.chart-bar',
                { scaleY: 0 },
                {
                    scaleY: 1,
                    duration: 1.5,
                    ease: 'power2.out',
                    stagger: 0.1,
                    delay: 1.5
                }
            );

            // Feature cards animation on scroll
            gsap.fromTo(
                '.feature-card',
                { y: 60, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.8,
                    ease: 'power2.out',
                    stagger: 0.2,
                    scrollTrigger: {
                        trigger: featuresRef.current,
                        start: 'top 80%',
                        end: 'bottom 20%',
                    }
                }
            );

            // Stats counter animation
            gsap.fromTo(
                '.stat-number',
                { scale: 0.5, opacity: 0 },
                {
                    scale: 1,
                    opacity: 1,
                    duration: 1,
                    ease: 'back.out(1.7)',
                    stagger: 0.2,
                    scrollTrigger: {
                        trigger: statsRef.current,
                        start: 'top 80%',
                    }
                }
            );

            // Floating animation for hero visual
            gsap.to('.dashboard-mockup', {
                y: -20,
                duration: 3,
                ease: 'power1.inOut',
                yoyo: true,
                repeat: -1
            });

        }, [heroRef, featuresRef, statsRef]);

        return () => ctx.revert();
    }, []);
    return (
        <div className="landing-page">
            {/* Navigation */}
            <nav className="navbar landing-navbar">
                <div className="navbar-container">
                    <Logo />
                    <div className="navbar-actions">
                        <ThemeToggle />
                        <Link to="/login" className="btn btn-ghost">
                            Sign In
                        </Link>
                        <Link to="/register" className="btn btn-primary">
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero-section" ref={heroRef}>
                <div className="hero-container">
                    <div className="hero-content">
                        <h1>
                            Intelligent <span className="gradient-text">Risk Assessment</span> 
                            <br />for Software Development
                        </h1>
                        <p className="hero-subtitle">
                            Transform your development workflow with AI-powered risk analysis. 
                            Detect potential issues before they impact your project timeline and budget.
                        </p>
                        <div className="hero-buttons">
                            <Link to="/register" className="btn btn-primary btn-large">
                                Start Free Trial
                            </Link>
                            <Link to="/demo" className="btn btn-secondary btn-large">
                                <BarChart3 size={20} />
                                View Demo
                            </Link>
                        </div>
                    </div>
                    
                    <div className="hero-visual">
                        <div className="dashboard-mockup">
                            <div className="mockup-header">
                                <div className="mockup-controls">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                                <span className="mockup-title">RiskGuard Dashboard</span>
                            </div>
                            <div className="mockup-content">
                                <div className="mockup-sidebar">
                                    <div className="mockup-item active"></div>
                                    <div className="mockup-item"></div>
                                    <div className="mockup-item"></div>
                                    <div className="mockup-item"></div>
                                </div>
                                <div className="mockup-main">
                                    <div className="mockup-chart">
                                        <div 
                                            className="chart-bar" 
                                            style={{
                                                height: '60%',
                                                backgroundColor: 'var(--primary)',
                                                transformOrigin: 'bottom'
                                            }}
                                        ></div>
                                        <div 
                                            className="chart-bar" 
                                            style={{
                                                height: '80%',
                                                backgroundColor: 'var(--secondary)',
                                                transformOrigin: 'bottom'
                                            }}
                                        ></div>
                                        <div 
                                            className="chart-bar" 
                                            style={{
                                                height: '45%',
                                                backgroundColor: 'var(--accent)',
                                                transformOrigin: 'bottom'
                                            }}
                                        ></div>
                                        <div 
                                            className="chart-bar" 
                                            style={{
                                                height: '90%',
                                                backgroundColor: 'var(--highlight)',
                                                transformOrigin: 'bottom'
                                            }}
                                        ></div>
                                    </div>
                                    <div className="mockup-cards">
                                        <div className="mockup-card primary"></div>
                                        <div className="mockup-card secondary"></div>
                                        <div className="mockup-card accent"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section" ref={featuresRef}>
                <div className="container">
                    <div className="section-header">
                        <h2>Powerful Features for Modern Development</h2>
                        <p>Everything you need to build secure, reliable software with confidence</p>
                    </div>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon gradient-primary-secondary">
                                <Shield />
                            </div>
                            <h3>AI-Powered Risk Detection</h3>
                            <p>Advanced machine learning algorithms analyze your code patterns to predict potential risks before they become issues.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon gradient-secondary-accent">
                                <BarChart3 />
                            </div>
                            <h3>Real-Time Analytics</h3>
                            <p>Monitor code quality metrics in real-time with interactive dashboards and detailed insights.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon gradient-accent-highlight">
                                <Zap />
                            </div>
                            <h3>Instant Feedback</h3>
                            <p>Get immediate feedback on code changes with our fast analysis engine and smart recommendations.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon gradient-primary-accent">
                                <Users />
                            </div>
                            <h3>Team Collaboration</h3>
                            <p>Share insights with your team, track progress, and maintain code quality across all projects.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="stats-section" ref={statsRef}>
                <div className="container">
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon">
                                <TrendingUp />
                            </div>
                            <div className="stat-number">99.2%</div>
                            <div className="stat-label">Accuracy Rate</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">
                                <Shield />
                            </div>
                            <div className="stat-number">10k+</div>
                            <div className="stat-label">Projects Analyzed</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">
                                <Timer />
                            </div>
                            <div className="stat-number">&lt;2s</div>
                            <div className="stat-label">Analysis Time</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">
                                <Star />
                            </div>
                            <div className="stat-number">4.9/5</div>
                            <div className="stat-label">User Rating</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="container">
                    <div className="cta-content">
                        <h2>Ready to Improve Your Code Quality?</h2>
                        <p>Join thousands of developers who trust RiskGuard to keep their projects on track</p>
                        <div className="cta-buttons">
                            <Link to="/register" className="btn btn-primary btn-large">
                                Start Free Trial
                            </Link>
                            <Link to="/contact" className="btn btn-outline btn-large">
                                Talk to Sales
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-brand">
                            <Logo />
                            <p>Intelligent risk assessment for modern software development teams.</p>
                        </div>
                        <div className="footer-column">
                            <h4>Product</h4>
                            <a href="#features">Features</a>
                            <a href="#pricing">Pricing</a>
                            <a href="#integrations">Integrations</a>
                            <a href="#security">Security</a>
                        </div>
                        <div className="footer-column">
                            <h4>Resources</h4>
                            <a href="#docs">Documentation</a>
                            <a href="#api">API Reference</a>
                            <a href="#guides">Guides</a>
                            <a href="#support">Support</a>
                        </div>
                        <div className="footer-column">
                            <h4>Company</h4>
                            <a href="#about">About</a>
                            <a href="#careers">Careers</a>
                            <a href="#blog">Blog</a>
                            <a href="#contact">Contact</a>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>&copy; 2024 RiskGuard. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};
export default LandingPage;
