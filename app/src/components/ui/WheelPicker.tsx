"use client";

import React, { useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { EmblaCarouselType } from 'embla-carousel';

interface WheelPickerProps {
    items: string[];
    value: string;
    onChange: (value: string) => void;
    label?: string;
}

const WheelPicker: React.FC<WheelPickerProps> = ({ items, value, onChange, label }) => {
    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: true,
        axis: 'y',
        dragFree: true,
        containScroll: false,
        watchDrag: true,
    });

    const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
        const index = emblaApi.selectedScrollSnap();
        // Embla loop might give large indexes, normalize them
        const normalizedIndex = index % items.length;
        const safeIndex = normalizedIndex < 0 ? items.length + normalizedIndex : normalizedIndex;
        const selectedItem = items[safeIndex];
        if (selectedItem !== undefined) {
            onChange(selectedItem);
        }
    }, [items, onChange]);

    useEffect(() => {
        if (!emblaApi) return;

        emblaApi.on('select', onSelect);

        // Initial set
        const currentIndex = items.indexOf(value);
        if (currentIndex !== -1) {
            emblaApi.scrollTo(currentIndex, true);
        }
    }, [emblaApi, onSelect, value, items]);

    return (
        <div className="wheel-picker-container">
            {label && <div className="wheel-label">{label}</div>}
            <div className="embla" ref={emblaRef}>
                <div className="embla__container">
                    {items.map((item, index) => (
                        <div key={index} className={`embla__slide ${value === item ? 'is-selected' : ''}`}>
                            {item}
                        </div>
                    ))}
                </div>
            </div>
            <div className="wheel-highlight" />
        </div>
    );
};

export default WheelPicker;
