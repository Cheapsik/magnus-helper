import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="font-app-brand text-4xl font-bold mb-2">404</h1>
      <p className="text-muted-foreground mb-4">Nie znaleziono strony</p>
      <a href="/" className="text-primary hover:underline text-sm">
        Wróć na stronę główną
      </a>
    </div>
  );
};

export default NotFound;
