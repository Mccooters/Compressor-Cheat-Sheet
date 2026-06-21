CREATE TABLE "equipment_controller" (
	"equipment_id" uuid NOT NULL,
	"controller_id" uuid NOT NULL,
	CONSTRAINT "equipment_controller_equipment_id_controller_id_pk" PRIMARY KEY("equipment_id","controller_id")
);
--> statement-breakpoint
ALTER TABLE "equipment_controller" ADD CONSTRAINT "equipment_controller_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_controller" ADD CONSTRAINT "equipment_controller_controller_id_controller_id_fk" FOREIGN KEY ("controller_id") REFERENCES "public"."controller"("id") ON DELETE cascade ON UPDATE no action;