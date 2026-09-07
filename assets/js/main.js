(function () {
    "use strict";

    const THEME_STORAGE_KEY = "villa-munhoz-theme";
    const DARK_THEME = "dark";
    const LIGHT_THEME = "light";
    const DESKTOP_MEDIA_QUERY = "(min-width: 901px)";
    const AUTOPLAY_DELAY = 6000;
    const SWIPE_THRESHOLD = 50;

    const themeToggle = document.querySelector(".theme-toggle");
    const themeToggleSymbol = themeToggle?.querySelector("[aria-hidden='true']");
    const menuToggle = document.querySelector(".menu-toggle");
    const menuToggleSymbol = menuToggle?.querySelector("[aria-hidden='true']");
    const mobileMenu = document.querySelector(".mobile-menu");
    const desktopMedia = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const reducedMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const categoryFilters = Array.from(
        document.querySelectorAll("[data-category-filter]")
    );
    const productCards = Array.from(
        document.querySelectorAll(".product-card[data-category]")
    );
    const featuredProducts = document.querySelector("#produtos");
    const productsStatus = document.querySelector(".featured-products__status");
    const hero = document.querySelector(".hero");
    const slides = hero ? Array.from(hero.querySelectorAll(".hero__slide")) : [];
    const dots = hero ? Array.from(hero.querySelectorAll(".hero__dot")) : [];
    const previousButton = hero?.querySelector("[data-carousel-previous]");
    const nextButton = hero?.querySelector("[data-carousel-next]");
    let currentSlideIndex = 0;
    let autoplayTimer = null;
    let isPointerOverHero = false;
    let isTouchingHero = false;
    let touchStartX = 0;
    let touchStartY = 0;

    function getStoredTheme() {
        try {
            const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

            return storedTheme === DARK_THEME || storedTheme === LIGHT_THEME
                ? storedTheme
                : null;
        } catch {
            return null;
        }
    }

    function storeTheme(theme) {
        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch {
            // O tema continua funcional quando o armazenamento está indisponível.
        }
    }

    function getInitialTheme() {
        const storedTheme = getStoredTheme();

        if (storedTheme) {
            return storedTheme;
        }

        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? DARK_THEME
            : LIGHT_THEME;
    }

    function applyTheme(theme, shouldPersist = false) {
        const isDark = theme === DARK_THEME;

        document.documentElement.toggleAttribute("data-theme", isDark);

        if (isDark) {
            document.documentElement.setAttribute("data-theme", DARK_THEME);
        }

        if (themeToggle) {
            themeToggle.setAttribute("aria-pressed", String(isDark));
            themeToggle.setAttribute(
                "aria-label",
                isDark ? "Ativar modo claro" : "Ativar modo escuro"
            );
        }

        if (themeToggleSymbol) {
            themeToggleSymbol.textContent = isDark ? "☀" : "◐";
        }

        if (shouldPersist) {
            storeTheme(theme);
        }
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.dataset.theme;
        const nextTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;

        applyTheme(nextTheme, true);
    }

    function setMenuOpen(isOpen, returnFocus = false) {
        if (!menuToggle || !mobileMenu) {
            return;
        }

        mobileMenu.hidden = !isOpen;
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");

        if (menuToggleSymbol) {
            menuToggleSymbol.textContent = isOpen ? "×" : "☰";
        }

        if (!isOpen && returnFocus) {
            menuToggle.focus();
        }
    }

    function toggleMenu() {
        if (!mobileMenu) {
            return;
        }

        setMenuOpen(mobileMenu.hidden);
    }

    function closeMenuOnLinkClick(event) {
        if (event.target.closest("a[href^='#']")) {
            setMenuOpen(false);
        }
    }

    function closeMenuOnEscape(event) {
        if (event.key === "Escape" && mobileMenu && !mobileMenu.hidden) {
            setMenuOpen(false, true);
        }
    }

    function closeMenuOnDesktop(event) {
        if (event.matches) {
            setMenuOpen(false);
        }
    }

    function getProductCategories(productCard) {
        return productCard.dataset.category.trim().split(/\s+/);
    }

    function getFilterName(filterLink) {
        const categoryTitle = filterLink
            .closest(".category-card")
            ?.querySelector(".category-card__title")
            ?.textContent.trim() || filterLink.textContent.trim();

        if (!categoryTitle) {
            return "";
        }

        const normalizedTitle = categoryTitle.toLocaleLowerCase("pt-BR");

        return (
            normalizedTitle.charAt(0).toLocaleUpperCase("pt-BR") +
            normalizedTitle.slice(1)
        );
    }

    function updateActiveFilter(activeFilter) {
        const activeCategory = activeFilter.dataset.categoryFilter;

        categoryFilters.forEach((filterLink) => {
            const isActive =
                filterLink.dataset.categoryFilter === activeCategory;

            filterLink.classList.toggle("category-filter--active", isActive);

            if (isActive) {
                filterLink.setAttribute("aria-current", "true");
            } else {
                filterLink.removeAttribute("aria-current");
            }
        });
    }

    function updateProductsStatus(filterLink, visibleCount) {
        if (!productsStatus) {
            return;
        }

        const selectedCategory = filterLink.dataset.categoryFilter;
        const message = selectedCategory === "all"
            ? `Todos os ${visibleCount} produtos estão sendo exibidos.`
            : `${visibleCount} ${visibleCount === 1 ? "produto encontrado" : "produtos encontrados"} em ${getFilterName(filterLink)}.`;

        productsStatus.textContent = "";
        window.requestAnimationFrame(() => {
            productsStatus.textContent = message;
        });
    }

    function applyProductFilter(filterLink, shouldScroll = true) {
        const selectedCategory = filterLink.dataset.categoryFilter;
        let visibleCount = 0;

        productCards.forEach((productCard) => {
            const shouldShow =
                selectedCategory === "all" ||
                getProductCategories(productCard).includes(selectedCategory);

            productCard.hidden = !shouldShow;

            if (shouldShow) {
                visibleCount += 1;
            }
        });

        updateActiveFilter(filterLink);
        updateProductsStatus(filterLink, visibleCount);

        if (shouldScroll && featuredProducts) {
            featuredProducts.scrollIntoView({
                behavior: reducedMotionMedia.matches ? "auto" : "smooth",
                block: "start"
            });
        }
    }

    function handleCategoryFilter(event) {
        event.preventDefault();
        applyProductFilter(event.currentTarget);
    }

    function getSlideControls(slide) {
        return Array.from(
            slide.querySelectorAll(
                "a[href], button, input, select, textarea, [tabindex]"
            )
        );
    }

    function goToSlide(index) {
        if (!slides.length) {
            return;
        }

        const previousSlide = slides[currentSlideIndex];
        const focusedElement = document.activeElement;
        const previousControls = previousSlide
            ? getSlideControls(previousSlide)
            : [];
        const focusedControlIndex = previousSlide?.contains(focusedElement)
            ? previousControls.indexOf(focusedElement)
            : -1;

        currentSlideIndex = ((index % slides.length) + slides.length) % slides.length;

        slides.forEach((slide, slideIndex) => {
            const isActive = slideIndex === currentSlideIndex;

            slide.classList.toggle("hero__slide--active", isActive);
            slide.setAttribute("aria-hidden", String(!isActive));

            if (isActive) {
                slide.removeAttribute("inert");
            } else {
                slide.setAttribute("inert", "");
            }

            getSlideControls(slide).forEach((control) => {
                if (isActive) {
                    control.removeAttribute("tabindex");
                } else {
                    control.setAttribute("tabindex", "-1");
                }
            });
        });

        dots.forEach((dot, dotIndex) => {
            const isActive = dotIndex === currentSlideIndex;

            dot.classList.toggle("hero__dot--active", isActive);

            if (isActive) {
                dot.setAttribute("aria-current", "true");
            } else {
                dot.removeAttribute("aria-current");
            }
        });

        hero.dataset.activeSlide = String(currentSlideIndex);

        if (focusedControlIndex >= 0) {
            const activeControls = getSlideControls(slides[currentSlideIndex]);
            const nextFocusTarget =
                activeControls[focusedControlIndex] || activeControls[0];

            nextFocusTarget?.focus({ preventScroll: true });
        }
    }

    function stopAutoplay() {
        if (autoplayTimer !== null) {
            window.clearInterval(autoplayTimer);
            autoplayTimer = null;
        }
    }

    function canAutoplay() {
        return Boolean(
            hero &&
            slides.length > 1 &&
            !isPointerOverHero &&
            !isTouchingHero &&
            !hero.contains(document.activeElement) &&
            document.visibilityState === "visible" &&
            !reducedMotionMedia.matches
        );
    }

    function startAutoplay() {
        stopAutoplay();

        if (!canAutoplay()) {
            return;
        }

        autoplayTimer = window.setInterval(() => {
            goToSlide(currentSlideIndex + 1);
        }, AUTOPLAY_DELAY);
    }

    function restartAutoplay() {
        stopAutoplay();
        startAutoplay();
    }

    function navigateManually(index) {
        goToSlide(index);
        restartAutoplay();
    }

    function handleHeroKeydown(event) {
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            navigateManually(currentSlideIndex - 1);
        }

        if (event.key === "ArrowRight") {
            event.preventDefault();
            navigateManually(currentSlideIndex + 1);
        }
    }

    function handleTouchStart(event) {
        const touch = event.changedTouches[0];

        isTouchingHero = true;
        stopAutoplay();
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }

    function handleTouchEnd(event) {
        const touch = event.changedTouches[0];
        const horizontalDistance = touch.clientX - touchStartX;
        const verticalDistance = touch.clientY - touchStartY;

        if (
            Math.abs(horizontalDistance) < SWIPE_THRESHOLD ||
            Math.abs(horizontalDistance) <= Math.abs(verticalDistance)
        ) {
            isTouchingHero = false;
            restartAutoplay();
            return;
        }

        goToSlide(
            horizontalDistance > 0
                ? currentSlideIndex - 1
                : currentSlideIndex + 1
        );

        isTouchingHero = false;
        restartAutoplay();
    }

    function handleTouchCancel() {
        isTouchingHero = false;
        restartAutoplay();
    }

    function handleVisibilityChange() {
        if (document.visibilityState === "hidden") {
            stopAutoplay();
        } else {
            startAutoplay();
        }
    }

    function handleHeroFocusOut(event) {
        if (event.relatedTarget && hero.contains(event.relatedTarget)) {
            return;
        }

        window.setTimeout(startAutoplay, 0);
    }

    function handleReducedMotionChange() {
        if (reducedMotionMedia.matches) {
            stopAutoplay();
        } else {
            startAutoplay();
        }
    }

    applyTheme(getInitialTheme());

    if (themeToggle) {
        themeToggle.addEventListener("click", toggleTheme);
    }

    if (menuToggle && mobileMenu) {
        setMenuOpen(false);
        menuToggle.addEventListener("click", toggleMenu);
        mobileMenu.addEventListener("click", closeMenuOnLinkClick);
        document.addEventListener("keydown", closeMenuOnEscape);
        desktopMedia.addEventListener("change", closeMenuOnDesktop);
    }

    if (categoryFilters.length && productCards.length) {
        categoryFilters.forEach((filterLink) => {
            filterLink.addEventListener("click", handleCategoryFilter);
        });

        const allProductsFilter = categoryFilters.find(
            (filterLink) => filterLink.dataset.categoryFilter === "all"
        );

        if (allProductsFilter) {
            updateActiveFilter(allProductsFilter);
            updateProductsStatus(allProductsFilter, productCards.length);
        }
    }

    if (hero && slides.length) {
        const initialSlideIndex = slides.findIndex((slide) =>
            slide.classList.contains("hero__slide--active")
        );

        slides.forEach((slide, slideIndex) => {
            slide.setAttribute(
                "aria-label",
                `${slideIndex + 1} de ${slides.length}`
            );
        });

        goToSlide(initialSlideIndex >= 0 ? initialSlideIndex : 0);

        if (slides.length === 1) {
            const controls = hero.querySelector(".hero__controls");

            if (controls) {
                controls.hidden = true;
            }
        }

        previousButton?.addEventListener("click", () => {
            navigateManually(currentSlideIndex - 1);
        });

        nextButton?.addEventListener("click", () => {
            navigateManually(currentSlideIndex + 1);
        });

        dots.forEach((dot) => {
            dot.addEventListener("click", () => {
                navigateManually(Number(dot.dataset.slideButton));
            });
        });

        hero.addEventListener("keydown", handleHeroKeydown);
        hero.addEventListener("mouseenter", () => {
            isPointerOverHero = true;
            stopAutoplay();
        });
        hero.addEventListener("mouseleave", () => {
            isPointerOverHero = false;
            startAutoplay();
        });
        hero.addEventListener("focusin", stopAutoplay);
        hero.addEventListener("focusout", handleHeroFocusOut);
        hero.addEventListener("touchstart", handleTouchStart, { passive: true });
        hero.addEventListener("touchend", handleTouchEnd, { passive: true });
        hero.addEventListener("touchcancel", handleTouchCancel, { passive: true });
        document.addEventListener("visibilitychange", handleVisibilityChange);
        reducedMotionMedia.addEventListener("change", handleReducedMotionChange);
        startAutoplay();
    }
})();
