declare module 'react-hook-form' {
  export interface UseFormReturn<T = any> {
    register: (name: string, options?: any) => any;
    handleSubmit: (onSubmit: (data: T) => void) => (e?: React.BaseSyntheticEvent) => Promise<void>;
    watch: (name?: string) => any;
    getValues: (name?: string) => any;
    setValue: (name: string, value: any) => void;
    reset: (values?: T) => void;
    formState: {
      errors: any;
      isSubmitting: boolean;
    };
  }

  export function useForm<T = any>(options?: any): UseFormReturn<T>;
}

