import * as React from "react";
import { cn } from "@/lib/utils";

const Card = ({ className, ...p }: React.ComponentProps<"div">) => <div className={cn("flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-xs", className)} {...p} />;
const CardHeader = ({ className, ...p }: React.ComponentProps<"div">) => <div className={cn("grid auto-rows-min items-start gap-1.5 px-6", className)} {...p} />;
const CardTitle = ({ className, ...p }: React.ComponentProps<"div">) => <div className={cn("font-semibold leading-none", className)} {...p} />;
const CardDescription = ({ className, ...p }: React.ComponentProps<"div">) => <div className={cn("text-sm text-muted-foreground", className)} {...p} />;
const CardContent = ({ className, ...p }: React.ComponentProps<"div">) => <div className={cn("px-6", className)} {...p} />;
const CardFooter = ({ className, ...p }: React.ComponentProps<"div">) => <div className={cn("flex items-center px-6", className)} {...p} />;
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
