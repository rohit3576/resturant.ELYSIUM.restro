// main.js - Elysium Interactive Experience

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Loader Logic
    const loader = document.getElementById('loader');
    const progressBar = document.getElementById('progress');
    const body = document.body;
    
    if (loader && progressBar) {
        body.style.overflow = 'hidden';

        let progress = 0;
        const loadInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 100) progress = 100;
            
            progressBar.style.width = `${progress}%`;
            
            if (progress === 100) {
                clearInterval(loadInterval);
                setTimeout(() => {
                    gsap.to(loader, {
                        yPercent: -100,
                        duration: 1.2,
                        ease: "power4.inOut",
                        onComplete: () => {
                            body.style.overflow = '';
                            if (typeof initScrollAnimations === 'function') {
                                initScrollAnimations();
                            }
                        }
                    });
                }, 500);
            }
        }, 150);
    }

    // 2. Lenis Smooth Scrolling
    let lenis;
    if (typeof Lenis !== 'undefined') {
        lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            direction: 'vertical',
            gestureDirection: 'vertical',
            smooth: true,
            mouseMultiplier: 1,
            smoothTouch: false,
            touchMultiplier: 2,
            infinite: false,
        });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        if (typeof ScrollTrigger !== 'undefined') {
            lenis.on('scroll', ScrollTrigger.update);
        }
        
        if (typeof gsap !== 'undefined') {
            gsap.ticker.add((time) => {
                lenis.raf(time * 1000);
            });
            gsap.ticker.lagSmoothing(0, 0);
        }
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target && lenis) {
                lenis.scrollTo(target, { offset: -80 });
            } else if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // 3. Three.js Canvas Background
    const canvas = document.getElementById('webgl-canvas');
    if (canvas && typeof THREE !== 'undefined') {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;

        const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const particlesGeometry = new THREE.BufferGeometry();
        const count = 1500;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const scales = new Float32Array(count);

        const colorGold = new THREE.Color('#d4af37');
        const colorDark = new THREE.Color('#8b6914');

        for(let i = 0; i < count; i++) {
            positions[i*3] = (Math.random() - 0.5) * 20;
            positions[i*3+1] = (Math.random() - 0.5) * 20;
            positions[i*3+2] = (Math.random() - 0.5) * 15;

            const mixedColor = colorGold.clone().lerp(colorDark, Math.random());
            colors[i*3] = mixedColor.r;
            colors[i*3+1] = mixedColor.g;
            colors[i*3+2] = mixedColor.b;

            scales[i] = Math.random();
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particlesGeometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

        const particleMaterial = new THREE.ShaderMaterial({
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
            vertexShader: `
                attribute float aScale;
                attribute vec3 color;
                varying vec3 vColor;
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = aScale * 8.0 * (300.0 / ( - mvPosition.z));
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                void main() {
                    float strength = distance(gl_PointCoord, vec2(0.5));
                    strength = 1.0 - strength;
                    strength = pow(strength, 3.0);
                    vec3 color = mix(vec3(0.0), vColor, strength);
                    gl_FragColor = vec4(color, strength * 0.8);
                }
            `,
            transparent: true
        });

        const particles = new THREE.Points(particlesGeometry, particleMaterial);
        scene.add(particles);

        let mouseX = 0, mouseY = 0;
        let cameraTargetX = 0, cameraTargetY = 0;
        const windowHalfX = window.innerWidth / 2;
        const windowHalfY = window.innerHeight / 2;

        document.addEventListener('mousemove', (event) => {
            mouseX = (event.clientX - windowHalfX);
            mouseY = (event.clientY - windowHalfY);
        });

        const clock = new THREE.Clock();
        const tick = () => {
            const elapsedTime = clock.getElapsedTime();
            particles.rotation.y = elapsedTime * 0.05;
            particles.rotation.x = elapsedTime * 0.02;

            cameraTargetX = mouseX * 0.001;
            cameraTargetY = mouseY * 0.001;

            camera.position.x += (cameraTargetX - camera.position.x) * 0.05;
            camera.position.y += (-cameraTargetY - camera.position.y) * 0.05;
            camera.lookAt(scene.position);

            renderer.render(scene, camera);
            requestAnimationFrame(tick);
        };
        tick();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    // 4. Fixed Custom Fluid Cursor & Magnetic Buttons
    const cursorDot = document.getElementById('cursor-dot');
    const cursorOutline = document.getElementById('cursor-outline');
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (!isTouchDevice && cursorDot && cursorOutline && typeof gsap !== 'undefined') {
        let cursorX = window.innerWidth / 2;
        let cursorY = window.innerHeight / 2;
        let outlineX = window.innerWidth / 2;
        let outlineY = window.innerHeight / 2;
        let isVisible = false;

        window.addEventListener('mousemove', (e) => {
            cursorX = e.clientX;
            cursorY = e.clientY;
            
            if (!isVisible) {
                cursorDot.style.opacity = '1';
                cursorOutline.style.opacity = '1';
                isVisible = true;
            }
            
            cursorDot.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
        });

        document.addEventListener('mouseleave', () => {
            cursorDot.style.opacity = '0';
            cursorOutline.style.opacity = '0';
            isVisible = false;
        });

        document.addEventListener('mouseenter', () => {
            cursorDot.style.opacity = '1';
            cursorOutline.style.opacity = '1';
            isVisible = true;
        });

        const animateCursor = () => {
            outlineX += (cursorX - outlineX) * 0.15;
            outlineY += (cursorY - outlineY) * 0.15;
            cursorOutline.style.transform = `translate(${outlineX}px, ${outlineY}px)`;
            requestAnimationFrame(animateCursor);
        };
        animateCursor();

        // Event delegation for dynamic hover effects
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('a, button, .dish-card, .gallery-item, .tab-btn');
            if (target && !target.closest('.chatbot-container')) {
                if (target.classList && (target.classList.contains('btn') || target.classList.contains('tab-btn'))) {
                    cursorOutline.classList.add('hover-subtle');
                } else {
                    cursorOutline.classList.add('hover-grow');
                }
            }
        });

        document.addEventListener('mouseout', (e) => {
            const target = e.target.closest('a, button, .dish-card, .gallery-item, .tab-btn');
            if (target) {
                cursorOutline.classList.remove('hover-grow', 'hover-subtle');
                if (target.classList && target.classList.contains('btn')) {
                    gsap.to(target, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
                }
            }
        });

        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.5, ease: "power2.out" });
            });
            
            btn.addEventListener('mouseleave', () => {
                gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
            });
        });
    } else {
        if(cursorDot) cursorDot.style.display = 'none';
        if(cursorOutline) cursorOutline.style.display = 'none';
    }

    // 5. GSAP Scroll Animations
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);
    }

    function initScrollAnimations() {
        if (typeof gsap === 'undefined') return;
        
        // Hero animations
        const heroLines = document.querySelectorAll('.hero-title .line');
        if (heroLines.length) {
            gsap.fromTo(heroLines, 
                { y: 100, opacity: 0 },
                { y: 0, opacity: 1, duration: 1.5, stagger: 0.2, ease: "power4.out", delay: 0.2 }
            );
        }

        const heroSubtitle = document.querySelector('.hero-subtitle');
        if (heroSubtitle) {
            gsap.fromTo('.hero-subtitle', 
                { y: 30, opacity: 0 }, 
                { y: 0, opacity: 1, duration: 1, ease: "power3.out", delay: 0.8 }
            );
        }
        
        const heroActions = document.querySelector('.hero-actions');
        if (heroActions) {
            gsap.fromTo('.hero-actions', 
                { y: 30, opacity: 0 }, 
                { y: 0, opacity: 1, duration: 1, ease: "power3.out", delay: 1 }
            );
        }

        // Scroll-triggered animations
        document.querySelectorAll('[data-scroll]').forEach(el => {
            if(!el.classList.contains('menu-showcase') && typeof ScrollTrigger !== 'undefined') {
                gsap.fromTo(el,
                    { y: 60, opacity: 0 },
                    { y: 0, opacity: 1, duration: 1.2, ease: "power3.out", 
                      scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none reverse" } 
                    }
                );
            }
        });

        // Header scroll effect
        const header = document.getElementById('header');
        if (header && typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.create({
                start: "top -50",
                onUpdate: (self) => {
                    if(self.direction === 1 && self.progress > 0) {
                        header.classList.add('scrolled');
                    } else if (self.progress === 0) {
                        header.classList.remove('scrolled');
                    }
                }
            });
        }
    }

    // 6. Mobile Menu Logic
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    let isMenuOpen = false;

    if (menuToggle && mobileMenu && typeof gsap !== 'undefined') {
        function toggleMenu() {
            isMenuOpen = !isMenuOpen;
            if(isMenuOpen) {
                mobileMenu.classList.add('active');
                body.style.overflow = 'hidden';
                const spans = menuToggle.children;
                if (spans[0]) gsap.to(spans[0], {rotation: 45, y: 8, duration: 0.3});
                if (spans[1]) gsap.to(spans[1], {opacity: 0, duration: 0.3});
                if (spans[2]) gsap.to(spans[2], {rotation: -45, y: -8, duration: 0.3});
            } else {
                mobileMenu.classList.remove('active');
                body.style.overflow = '';
                const spans = menuToggle.children;
                if (spans[0]) gsap.to(spans[0], {rotation: 0, y: 0, duration: 0.3});
                if (spans[1]) gsap.to(spans[1], {opacity: 1, duration: 0.3});
                if (spans[2]) gsap.to(spans[2], {rotation: 0, y: 0, duration: 0.3});
            }
        }

        menuToggle.addEventListener('click', toggleMenu);
        document.querySelectorAll('.mobile-link').forEach(link => link.addEventListener('click', toggleMenu));
    }

    // 7. Dynamic JSON Menu
    const menuData = {
        "tasting": [
            { name: "Diver Scallops", price: "$38", description: "Cauliflower purée, brown butter caper sauce, compressed apple, micro-cilantro.", image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80", alt: "Pan-Seared Scallops" },
            { name: "A5 Wagyu Striploin", price: "$115", description: "Black garlic emulsion, charred maitake mushrooms, smoked bone marrow jus.", image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80", alt: "Wagyu Beef" },
            { name: "Truffle Risotto", price: "$42", description: "Aquerello rice, 36-month Parmigiano-Reggiano, freshly shaved Alba white truffle.", image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=600&q=80", alt: "Truffle Risotto" }
        ],
        "a-la-carte": [
            { name: "Ora King Salmon", price: "$45", description: "Beetroot dashi, pickled mustard seeds, sea fennel, dill oil.", image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80", alt: "Salmon Dish" },
            { name: "Duck Breast", price: "$52", description: "Cherry gastrique, parsnip fondant, endive, duck jus.", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80", alt: "Duck Breast" }
        ],
        "desserts": [
            { name: "Dark Chocolate Textures", price: "$22", description: "Valrhona 70% cremeux, cocoa nib tuile, blackberry sorbet.", image: "https://images.unsplash.com/photo-1574085733277-851d9d856a3a?auto=format&fit=crop&w=600&q=80", alt: "Chocolate Dessert" },
            { name: "Yuzu Sphere", price: "$18", description: "White chocolate shell, yuzu curd, matcha sponge, toasted sesame.", image: "https://images.unsplash.com/photo-1563805042-7684c8e9e533?auto=format&fit=crop&w=600&q=80", alt: "Citrus Dessert" }
        ]
    };

    const menuContainer = document.getElementById('menu-container');
    const tabButtons = document.querySelectorAll('.tab-btn');

    function renderMenu(category) {
        if (!menuContainer) return;
        
        menuContainer.innerHTML = '';
        if (!menuData[category]) return;
        
        menuData[category].forEach(item => {
            menuContainer.insertAdjacentHTML('beforeend', `
                <div class="dish-card" data-tilt style="opacity: 0; transform: translateY(20px);">
                    <div class="dish-image"><img src="${item.image}" alt="${item.alt}" loading="lazy"></div>
                    <div class="dish-info">
                        <div class="dish-header"><h3>${item.name}</h3><span class="price">${item.price}</span></div>
                        <p>${item.description}</p>
                    </div>
                </div>
            `);
        });

        if (typeof VanillaTilt !== 'undefined') {
            VanillaTilt.init(document.querySelectorAll(".dish-card[data-tilt]"), { 
                max: 10, 
                speed: 400, 
                glare: true, 
                "max-glare": 0.2, 
                gyroscope: true 
            });
        }
        
        if (typeof gsap !== 'undefined') {
            gsap.to(menuContainer.querySelectorAll('.dish-card'), 
                { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "power3.out" }
            );
        } else {
            document.querySelectorAll('.dish-card').forEach(card => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            });
        }
    }

    if (menuContainer && tabButtons.length) {
        renderMenu('tasting');

        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const target = btn.getAttribute('data-target');
                if (target) renderMenu(target);
            });
        });
    }

    // 8. Reviews Coverflow Carousel
    const carouselItems = document.querySelectorAll('.carousel-item');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const track = document.getElementById('reviewTrack');
    
    if (carouselItems.length > 0) {
        let currentIndex = 0;
        const totalItems = carouselItems.length;

        const updateCarousel = () => {
            carouselItems.forEach(item => {
                item.className = 'review-card carousel-item';
            });

            const prev1 = (currentIndex - 1 + totalItems) % totalItems;
            const next1 = (currentIndex + 1) % totalItems;
            const prev2 = (currentIndex - 2 + totalItems) % totalItems;
            const next2 = (currentIndex + 2) % totalItems;

            if (carouselItems[currentIndex]) carouselItems[currentIndex].classList.add('active');
            if (carouselItems[prev1]) carouselItems[prev1].classList.add('prev-1');
            if (carouselItems[next1]) carouselItems[next1].classList.add('next-1');
            if (carouselItems[prev2]) carouselItems[prev2].classList.add('prev-2');
            if (carouselItems[next2]) carouselItems[next2].classList.add('next-2');
        };

        updateCarousel();

        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => { 
                currentIndex = (currentIndex - 1 + totalItems) % totalItems; 
                updateCarousel(); 
            });
            nextBtn.addEventListener('click', () => { 
                currentIndex = (currentIndex + 1) % totalItems; 
                updateCarousel(); 
            });
        }

        let autoplayInterval = setInterval(() => { 
            currentIndex = (currentIndex + 1) % totalItems; 
            updateCarousel(); 
        }, 5000);

        if (track) {
            track.addEventListener('mouseenter', () => clearInterval(autoplayInterval));
            track.addEventListener('mouseleave', () => {
                autoplayInterval = setInterval(() => { 
                    currentIndex = (currentIndex + 1) % totalItems; 
                    updateCarousel(); 
                }, 5000);
            });
        }
    }

    // 9. Booking Form
    const bookingForm = document.getElementById('bookingForm');
    if(bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('submitBtn');
            if (!submitBtn) return;
            
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span>Processing...</span> <i class="fa-solid fa-spinner fa-spin"></i>';
            submitBtn.style.opacity = '0.7';
            
            setTimeout(() => {
                const nameField = document.getElementById('name');
                const dateField = document.getElementById('date');
                const timeField = document.getElementById('time');
                const name = nameField ? nameField.value : 'Guest';
                const date = dateField ? dateField.value : 'selected date';
                const time = timeField ? timeField.value : 'selected time';
                
                alert(`Reservation Confirmed for ${name}!\nWe look forward to hosting you on ${date} at ${time}.`);
                bookingForm.reset();
                submitBtn.innerHTML = originalText;
                submitBtn.style.opacity = '1';
            }, 1500);
        });
    }

    // 10. Custom Chatbot Logic
    const chatbotToggle = document.getElementById('chatbotToggle');
    const chatbotClose = document.getElementById('chatbotClose');
    const chatbotWindow = document.getElementById('chatbotWindow');
    const chatbotInput = document.getElementById('chatbotInput');
    const chatbotSend = document.getElementById('chatbotSend');
    const chatbotMessages = document.getElementById('chatbotMessages');

    if (chatbotToggle && chatbotClose && chatbotWindow) {
        chatbotToggle.addEventListener('click', () => chatbotWindow.classList.toggle('active'));
        chatbotClose.addEventListener('click', () => chatbotWindow.classList.remove('active'));

        const addMessage = (text, sender) => {
            if (!chatbotMessages) return;
            const msg = document.createElement('div');
            msg.className = `message ${sender}`;
            msg.textContent = text;
            chatbotMessages.appendChild(msg);
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        };

        const handleChat = () => {
            if (!chatbotInput) return;
            const text = chatbotInput.value.trim();
            if (!text) return;

            addMessage(text, 'user');
            chatbotInput.value = '';

            setTimeout(() => {
                let response = "I'm sorry, I didn't quite catch that. Would you like to know about our menu, hours, or how to make a reservation?";
                const input = text.toLowerCase();

                if (input.includes('menu')) {
                    response = "Our Tasting Menu features seasonal highlights like Diver Scallops and A5 Wagyu. You can view the full selection in our Cuisine section.";
                } else if (input.includes('hour') || input.includes('open') || input.includes('time')) {
                    response = "We are open Wednesday through Sunday, from 5:30 PM to 10:30 PM. We are closed on Mondays and Tuesdays.";
                } else if (input.includes('reservation') || input.includes('book') || input.includes('table')) {
                    response = "You can book a table directly through our online reservation form below. We accept bookings up to 60 days in advance.";
                } else if (input.includes('hello') || input.includes('hi')) {
                    response = "Greetings. How can I assist you with your experience at Elysium today?";
                } else if (input.includes('chef') || input.includes('chef vance')) {
                    response = "Chef Marcus Vance leads our kitchen with over 15 years of Michelin-starred experience. His philosophy centers on seasonal, sustainable ingredients.";
                } else if (input.includes('wine') || input.includes('pairing')) {
                    response = "Our sommelier has curated exceptional wine pairings for both our Tasting Menu and à la carte options. We'd be delighted to recommend something special.";
                }

                addMessage(response, 'assistant');
            }, 800);
        };

        if (chatbotSend) {
            chatbotSend.addEventListener('click', handleChat);
        }
        
        if (chatbotInput) {
            chatbotInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleChat();
            });
        }
    }
});