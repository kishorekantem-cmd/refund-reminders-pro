const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <img 
          src="/logo.png" 
          alt="ReFundly Logo" 
          className="w-32 h-32 object-contain"
        />
        <div className="w-48 h-1 bg-primary/20 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-[loading_1.5s_ease-in-out_infinite]" 
               style={{
                 animation: 'loading 1.5s ease-in-out infinite',
               }}
          />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
