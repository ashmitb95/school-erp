import React, { useState } from 'react';
import { Search, Loader, MapPin, X } from 'lucide-react';
import api from '../../services/api';
import Input from '../Input/Input';
import Button from '../Button/Button';
import styles from './GeocodeInput.module.css';

export interface GeocodeResult {
    latitude: number;
    longitude: number;
    formatted_address: string;
}

interface GeocodeInputProps {
    onGeocode: (result: GeocodeResult) => void;
    placeholder?: string;
    disabled?: boolean;
    initialValue?: string;
}

const GeocodeInput: React.FC<GeocodeInputProps> = ({
    onGeocode,
    placeholder = 'Enter address to search...',
    disabled = false,
    initialValue = '',
}) => {
    const [address, setAddress] = useState(initialValue);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<GeocodeResult | null>(null);

    const handleGeocode = async () => {
        if (!address.trim()) {
            setError('Please enter an address');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await api.post('/management/transport-routes/geocode', {
                address: address.trim(),
            });

            const result: GeocodeResult = response.data;
            setLastResult(result);
            onGeocode(result);
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || 'Failed to geocode address';
            setError(errorMessage);
            console.error('Geocoding error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        setAddress('');
        setError(null);
        setLastResult(null);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            handleGeocode();
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.inputGroup}>
                <div className={styles.inputWrapper}>
                    <Search className={styles.searchIcon} size={18} />
                    <Input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={placeholder}
                        disabled={disabled || isLoading}
                        className={styles.input}
                    />
                    {address && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className={styles.clearButton}
                            disabled={isLoading}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
                <Button
                    onClick={handleGeocode}
                    disabled={disabled || isLoading || !address.trim()}
                    className={styles.geocodeButton}
                >
                    {isLoading ? (
                        <>
                            <Loader className={styles.spinner} size={16} />
                            Searching...
                        </>
                    ) : (
                        <>
                            <MapPin size={16} />
                            Geocode
                        </>
                    )}
                </Button>
            </div>

            {error && (
                <div className={styles.error}>
                    {error}
                </div>
            )}

            {lastResult && !error && (
                <div className={styles.result}>
                    <MapPin size={14} />
                    <span className={styles.resultAddress}>{lastResult.formatted_address}</span>
                    <span className={styles.resultCoords}>
                        {lastResult.latitude.toFixed(6)}, {lastResult.longitude.toFixed(6)}
                    </span>
                </div>
            )}
        </div>
    );
};

export default GeocodeInput;

