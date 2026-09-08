import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../context/AuthContext";

type ApiUnit = {
  id: string;
  propertyId: string;
  buildingId: string;
  floorId: string;
  label: string;
  bedrooms: number;
  bathrooms: number;
  monthlyRent: string;
  status: "OCCUPIED" | "VACANT" | "RESERVED" | "MAINTENANCE" | "DELINQUENT";
  building?: { name: string };
  floor?: { level: number };
};

type UnitStatus = ApiUnit["status"];

type ApiBuilding = {
  id: string;
  name: string;
  floors: { id: string; level: number }[];
  units: ApiUnit[];
};

type ApiProperty = {
  id: string;
  name: string;
  address: string;
  city: string;
  status: string;
  buildings: ApiBuilding[];
  units: ApiUnit[];
};

const statusColor = (status: ApiUnit["status"] | string) => {
  switch (status) {
    case "OCCUPIED":
      return "success";
    case "VACANT":
      return "light";
    case "RESERVED":
      return "warning";
    case "MAINTENANCE":
      return "info";
    case "DELINQUENT":
      return "error";
    default:
      return "primary";
  }
};

const formatCurrency = (value: string) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));

export default function Properties() {
  const { token } = useAuth();
  const [properties, setProperties] = useState<ApiProperty[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [editingPropertyId, setEditingPropertyId] = useState("");
  const [propertyForm, setPropertyForm] = useState({
    name: "",
    address: "",
    city: "",
    status: "active",
  });
  const [buildingForm, setBuildingForm] = useState({ id: "", name: "" });
  const [floorForm, setFloorForm] = useState({
    id: "",
    buildingId: "",
    level: "1",
  });
  const [unitForm, setUnitForm] = useState({
    id: "",
    buildingId: "",
    floorId: "",
    label: "",
    bedrooms: "1",
    bathrooms: "1",
    monthlyRent: "0",
    status: "VACANT" as UnitStatus,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUnit, setSelectedUnit] = useState<ApiUnit | null>(null);
  const [unitStatus, setUnitStatus] = useState<UnitStatus>("VACANT");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadProperties = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/properties`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to load properties");
      }

      setProperties(data.properties);
      setSelectedPropertyId((currentId) => currentId || data.properties[0]?.id || "");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load properties"
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadProperties();
    }
  }, [loadProperties, token]);

  const selectedProperty =
    properties.find((property) => property.id === selectedPropertyId) ??
    properties[0];

  const units = selectedProperty?.units ?? [];
  const filteredUnits = useMemo(
    () =>
      units.filter((unit) => {
        const matchesSearch = unit.label
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesStatus =
          statusFilter === "all" || unit.status === statusFilter;

        return matchesSearch && matchesStatus;
      }),
    [search, statusFilter, units]
  );

  const occupiedUnits = units.filter((unit) => unit.status === "OCCUPIED").length;
  const vacantUnits = units.filter((unit) => unit.status === "VACANT").length;
  const maintenanceUnits = units.filter(
    (unit) => unit.status === "MAINTENANCE"
  ).length;
  const occupancyRate =
    units.length === 0 ? 0 : Math.round((occupiedUnits / units.length) * 100);

  const startAddProperty = () => {
    setEditingPropertyId("");
    setPropertyForm({ name: "", address: "", city: "", status: "active" });
  };

  const startEditProperty = () => {
    if (!selectedProperty) {
      return;
    }

    setEditingPropertyId(selectedProperty.id);
    setPropertyForm({
      name: selectedProperty.name,
      address: selectedProperty.address,
      city: selectedProperty.city,
      status: selectedProperty.status,
    });
  };

  const handleSaveProperty = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        editingPropertyId
          ? `${API_BASE_URL}/properties/${editingPropertyId}`
          : `${API_BASE_URL}/properties`,
        {
          method: editingPropertyId ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(propertyForm),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to save property");
      }

      setMessage(editingPropertyId ? "Property updated." : "Property created.");
      setSelectedPropertyId(data.property.id);
      setEditingPropertyId("");
      setPropertyForm({ name: "", address: "", city: "", status: "active" });
      await loadProperties();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save property"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveUnitStatus = async () => {
    if (!selectedUnit) {
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/units/${selectedUnit.id}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: unitStatus }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to save unit status");
      }

      setSelectedUnit(data.unit);
      setMessage("Unit status updated.");
      await loadProperties();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save unit status"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchiveProperty = async () => {
    if (!selectedProperty || !confirm("Archive this property?")) {
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/properties/${selectedProperty.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error("Unable to archive property");
      }

      setMessage("Property archived.");
      setSelectedPropertyId("");
      await loadProperties();
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Unable to archive property"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBuilding = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedProperty) {
      return;
    }

    await saveJson({
      url: buildingForm.id
        ? `${API_BASE_URL}/buildings/${buildingForm.id}`
        : `${API_BASE_URL}/buildings`,
      method: buildingForm.id ? "PUT" : "POST",
      body: { propertyId: selectedProperty.id, name: buildingForm.name },
      success: buildingForm.id ? "Building updated." : "Building created.",
      afterSave: () => setBuildingForm({ id: "", name: "" }),
    });
  };

  const handleArchiveBuilding = async (buildingId: string) => {
    if (!confirm("Archive this building?")) {
      return;
    }

    await saveJson({
      url: `${API_BASE_URL}/buildings/${buildingId}`,
      method: "DELETE",
      success: "Building archived.",
    });
  };

  const handleSaveFloor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const buildingId = floorForm.buildingId || selectedProperty?.buildings[0]?.id;

    if (!buildingId) {
      setError("Create a building before adding floors.");
      return;
    }

    await saveJson({
      url: floorForm.id
        ? `${API_BASE_URL}/floors/${floorForm.id}`
        : `${API_BASE_URL}/floors`,
      method: floorForm.id ? "PUT" : "POST",
      body: { buildingId, level: Number(floorForm.level) },
      success: floorForm.id ? "Floor updated." : "Floor created.",
      afterSave: () => setFloorForm({ id: "", buildingId: "", level: "1" }),
    });
  };

  const handleArchiveFloor = async (floorId: string) => {
    if (!confirm("Archive this floor?")) {
      return;
    }

    await saveJson({
      url: `${API_BASE_URL}/floors/${floorId}`,
      method: "DELETE",
      success: "Floor archived.",
    });
  };

  const handleSaveUnit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedProperty) {
      return;
    }

    const buildingId = unitForm.buildingId || selectedProperty.buildings[0]?.id;
    const floorId =
      unitForm.floorId ||
      selectedProperty.buildings.find((building) => building.id === buildingId)
        ?.floors[0]?.id;

    if (!buildingId || !floorId) {
      setError("Create a building and floor before adding units.");
      return;
    }

    await saveJson({
      url: unitForm.id ? `${API_BASE_URL}/units/${unitForm.id}` : `${API_BASE_URL}/units`,
      method: unitForm.id ? "PUT" : "POST",
      body: {
        propertyId: selectedProperty.id,
        buildingId,
        floorId,
        label: unitForm.label,
        bedrooms: Number(unitForm.bedrooms),
        bathrooms: Number(unitForm.bathrooms),
        monthlyRent: Number(unitForm.monthlyRent),
        status: unitForm.status,
      },
      success: unitForm.id ? "Unit updated." : "Unit created.",
      afterSave: () =>
        setUnitForm({
          id: "",
          buildingId: "",
          floorId: "",
          label: "",
          bedrooms: "1",
          bathrooms: "1",
          monthlyRent: "0",
          status: "VACANT",
        }),
    });
  };

  const handleArchiveUnit = async (unitId: string) => {
    if (!confirm("Archive this unit?")) {
      return;
    }

    await saveJson({
      url: `${API_BASE_URL}/units/${unitId}`,
      method: "DELETE",
      success: "Unit archived.",
      afterSave: () => setSelectedUnit(null),
    });
  };

  async function saveJson({
    url,
    method,
    body,
    success,
    afterSave,
  }: {
    url: string;
    method: "POST" | "PUT" | "DELETE";
    body?: unknown;
    success: string;
    afterSave?: () => void;
  }) {
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? "Unable to save changes");
      }

      afterSave?.();
      setMessage(success);
      await loadProperties();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save changes"
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <PageMeta
        title="Properties | Property Management Dashboard"
        description="Manage properties, buildings, floors, units, and visual unit status."
      />
      <PageBreadcrumb pageTitle="Properties" />

      <div className="space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Property Inventory
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                View properties, buildings, floors, units, and current unit status from PostgreSQL.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={selectedPropertyId}
                onChange={(event) => setSelectedPropertyId(event.target.value)}
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={startEditProperty}
                className="h-11 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleArchiveProperty}
                disabled={!selectedProperty || isSaving}
                className="h-11 rounded-lg border border-error-300 px-4 text-sm font-medium text-error-600 hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-error-500/40 dark:text-error-400 dark:hover:bg-error-500/10"
              >
                Archive
              </button>
              <button
                type="button"
                onClick={startAddProperty}
                className="h-11 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
              >
                Add
              </button>
            </div>
          </div>
        </section>

        <form
          onSubmit={handleSaveProperty}
          className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <Field label="Property Name">
              <input
                required
                value={propertyForm.name}
                onChange={(event) =>
                  setPropertyForm((form) => ({
                    ...form,
                    name: event.target.value,
                  }))
                }
                placeholder="Property name"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </Field>
            <Field label="Address">
              <input
                required
                value={propertyForm.address}
                onChange={(event) =>
                  setPropertyForm((form) => ({
                    ...form,
                    address: event.target.value,
                  }))
                }
                placeholder="Street address"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </Field>
            <Field label="City">
              <input
                required
                value={propertyForm.city}
                onChange={(event) =>
                  setPropertyForm((form) => ({
                    ...form,
                    city: event.target.value,
                  }))
                }
                placeholder="City"
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </Field>
            <Field label="Status">
              <select
                value={propertyForm.status}
                onChange={(event) =>
                  setPropertyForm((form) => ({
                    ...form,
                    status: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <button
              disabled={isSaving}
              className="h-11 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? "Saving..."
                : editingPropertyId
                ? "Save Changes"
                : "Save Property"}
            </button>
          </div>
        </form>

        {message && (
          <div className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-600 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
            Loading property inventory...
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Metric label="Total Units" value={String(units.length)} />
              <Metric label="Occupancy" value={`${occupancyRate}%`} />
              <Metric label="Vacant Units" value={String(vacantUnits)} />
              <Metric label="Maintenance" value={String(maintenanceUnits)} />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <CrudPanel title="Buildings">
                <form onSubmit={handleSaveBuilding} className="space-y-3">
                  <input
                    required
                    value={buildingForm.name}
                    onChange={(event) =>
                      setBuildingForm((form) => ({
                        ...form,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Building name"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                  <button
                    disabled={isSaving}
                    className="h-11 w-full rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {buildingForm.id ? "Save Building" : "Add Building"}
                  </button>
                </form>
                <div className="mt-4 space-y-2">
                  {selectedProperty?.buildings.map((building) => (
                    <ActionRow
                      key={building.id}
                      title={`Building ${building.name}`}
                      detail={`${building.floors.length} floors / ${building.units.length} units`}
                      onEdit={() =>
                        setBuildingForm({ id: building.id, name: building.name })
                      }
                      onArchive={() => void handleArchiveBuilding(building.id)}
                    />
                  ))}
                </div>
              </CrudPanel>

              <CrudPanel title="Floors">
                <form onSubmit={handleSaveFloor} className="space-y-3">
                  <select
                    value={floorForm.buildingId}
                    onChange={(event) =>
                      setFloorForm((form) => ({
                        ...form,
                        buildingId: event.target.value,
                      }))
                    }
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value="">Select building</option>
                    {selectedProperty?.buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        Building {building.name}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    type="number"
                    value={floorForm.level}
                    onChange={(event) =>
                      setFloorForm((form) => ({
                        ...form,
                        level: event.target.value,
                      }))
                    }
                    placeholder="Floor level"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                  <button
                    disabled={isSaving}
                    className="h-11 w-full rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {floorForm.id ? "Save Floor" : "Add Floor"}
                  </button>
                </form>
                <div className="mt-4 space-y-2">
                  {selectedProperty?.buildings.flatMap((building) =>
                    building.floors.map((floor) => (
                      <ActionRow
                        key={floor.id}
                        title={`Floor ${floor.level}`}
                        detail={`Building ${building.name}`}
                        onEdit={() =>
                          setFloorForm({
                            id: floor.id,
                            buildingId: building.id,
                            level: String(floor.level),
                          })
                        }
                        onArchive={() => void handleArchiveFloor(floor.id)}
                      />
                    ))
                  )}
                </div>
              </CrudPanel>

              <CrudPanel title="Units">
                <form onSubmit={handleSaveUnit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={unitForm.buildingId}
                      onChange={(event) =>
                        setUnitForm((form) => ({
                          ...form,
                          buildingId: event.target.value,
                          floorId: "",
                        }))
                      }
                      className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    >
                      <option value="">Building</option>
                      {selectedProperty?.buildings.map((building) => (
                        <option key={building.id} value={building.id}>
                          {building.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={unitForm.floorId}
                      onChange={(event) =>
                        setUnitForm((form) => ({
                          ...form,
                          floorId: event.target.value,
                        }))
                      }
                      className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    >
                      <option value="">Floor</option>
                      {selectedProperty?.buildings
                        .filter(
                          (building) =>
                            !unitForm.buildingId ||
                            building.id === unitForm.buildingId
                        )
                        .flatMap((building) =>
                          building.floors.map((floor) => (
                            <option key={floor.id} value={floor.id}>
                              {building.name} / {floor.level}
                            </option>
                          ))
                        )}
                    </select>
                  </div>
                  <input
                    required
                    value={unitForm.label}
                    onChange={(event) =>
                      setUnitForm((form) => ({ ...form, label: event.target.value }))
                    }
                    placeholder="Unit label"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      required
                      type="number"
                      value={unitForm.bedrooms}
                      onChange={(event) =>
                        setUnitForm((form) => ({
                          ...form,
                          bedrooms: event.target.value,
                        }))
                      }
                      placeholder="Beds"
                      className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                    <input
                      required
                      type="number"
                      value={unitForm.bathrooms}
                      onChange={(event) =>
                        setUnitForm((form) => ({
                          ...form,
                          bathrooms: event.target.value,
                        }))
                      }
                      placeholder="Baths"
                      className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                    <input
                      required
                      type="number"
                      value={unitForm.monthlyRent}
                      onChange={(event) =>
                        setUnitForm((form) => ({
                          ...form,
                          monthlyRent: event.target.value,
                        }))
                      }
                      placeholder="Rent"
                      className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>
                  <select
                    value={unitForm.status}
                    onChange={(event) =>
                      setUnitForm((form) => ({
                        ...form,
                        status: event.target.value as UnitStatus,
                      }))
                    }
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value="OCCUPIED">Occupied</option>
                    <option value="VACANT">Vacant</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="DELINQUENT">Delinquent</option>
                  </select>
                  <button
                    disabled={isSaving}
                    className="h-11 w-full rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {unitForm.id ? "Save Unit" : "Add Unit"}
                  </button>
                </form>
              </CrudPanel>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6 xl:col-span-2">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      Units
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {selectedProperty?.address}, {selectedProperty?.city}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search unit"
                      className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    >
                      <option value="all">All statuses</option>
                      <option value="OCCUPIED">Occupied</option>
                      <option value="VACANT">Vacant</option>
                      <option value="RESERVED">Reserved</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="DELINQUENT">Delinquent</option>
                    </select>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="max-w-full overflow-x-auto">
                    <Table>
                      <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                        <TableRow>
                          <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                            Unit
                          </TableCell>
                          <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                            Building
                          </TableCell>
                          <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                            Layout
                          </TableCell>
                          <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                            Rent
                          </TableCell>
                          <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500">
                            Status
                          </TableCell>
                          <TableCell isHeader className="px-5 py-3 text-right text-xs font-medium uppercase text-gray-500">
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filteredUnits.map((unit) => (
                          <TableRow
                            key={unit.id}
                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                          >
                            <TableCell className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedUnit(unit);
                                  setUnitStatus(unit.status);
                                }}
                                className="font-medium text-gray-900 hover:text-brand-500 dark:text-white"
                              >
                                {unit.label}
                              </button>
                            </TableCell>
                            <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {unit.building?.name ?? "Unassigned"} / Floor{" "}
                              {unit.floor?.level ?? "-"}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {unit.bedrooms} bed, {unit.bathrooms} bath
                            </TableCell>
                            <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {formatCurrency(unit.monthlyRent)}
                            </TableCell>
                            <TableCell className="px-5 py-4 text-sm">
                              <Badge color={statusColor(unit.status)} size="sm">
                                {unit.status.toLowerCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-5 py-4 text-right text-sm">
                              <button
                                type="button"
                                onClick={() =>
                                  setUnitForm({
                                    id: unit.id,
                                    buildingId: unit.buildingId,
                                    floorId: unit.floorId,
                                    label: unit.label,
                                    bedrooms: String(unit.bedrooms),
                                    bathrooms: String(unit.bathrooms),
                                    monthlyRent: unit.monthlyRent,
                                    status: unit.status,
                                  })
                                }
                                className="mr-3 font-medium text-brand-500 hover:text-brand-600"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleArchiveUnit(unit.id)}
                                className="font-medium text-error-500 hover:text-error-600"
                              >
                                Archive
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Visual Floor Plan
                </h2>
                <div className="mt-5 space-y-5">
                  {selectedProperty?.buildings.map((building) => (
                    <div key={building.id}>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Building {building.name}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2">
                        {building.units.map((unit) => (
                          <div
                            key={unit.id}
                            onClick={() => {
                              setSelectedUnit(unit);
                              setUnitStatus(unit.status);
                            }}
                            className="aspect-[4/3] rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-white/[0.02]"
                          >
                            <div className="flex h-full flex-col justify-between">
                              <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {unit.label}
                                </p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  Floor {unit.floor?.level ?? "-"}
                                </p>
                              </div>
                              <Badge color={statusColor(unit.status)} size="sm">
                                {unit.status.toLowerCase()}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {selectedUnit && (
          <div className="fixed inset-0 z-99999 flex justify-end bg-gray-900/40">
            <button
              type="button"
              aria-label="Close unit details"
              className="absolute inset-0 cursor-default"
              onClick={() => setSelectedUnit(null)}
            />
            <aside className="relative h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl dark:bg-gray-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Unit Details
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                    {selectedUnit.label}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUnit(null)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                >
                  Close
                </button>
              </div>

              <div className="mt-6">
                <Badge color={statusColor(selectedUnit.status)} size="md">
                  {selectedUnit.status.toLowerCase()}
                </Badge>
              </div>

              <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Unit Status
                </label>
                <div className="mt-3 flex gap-3">
                  <select
                    value={unitStatus}
                    onChange={(event) =>
                      setUnitStatus(event.target.value as UnitStatus)
                    }
                    className="h-11 flex-1 rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value="OCCUPIED">Occupied</option>
                    <option value="VACANT">Vacant</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="DELINQUENT">Delinquent</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleSaveUnitStatus}
                    disabled={isSaving}
                    className="h-11 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setUnitForm({
                      id: selectedUnit.id,
                      buildingId: selectedUnit.buildingId,
                      floorId: selectedUnit.floorId,
                      label: selectedUnit.label,
                      bedrooms: String(selectedUnit.bedrooms),
                      bathrooms: String(selectedUnit.bathrooms),
                      monthlyRent: selectedUnit.monthlyRent,
                      status: selectedUnit.status,
                    })
                  }
                  className="h-11 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                >
                  Edit Unit
                </button>
                <button
                  type="button"
                  onClick={() => void handleArchiveUnit(selectedUnit.id)}
                  disabled={isSaving}
                  className="h-11 rounded-lg border border-error-300 px-4 text-sm font-medium text-error-600 hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-error-500/40 dark:text-error-400 dark:hover:bg-error-500/10"
                >
                  Archive Unit
                </button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <Detail label="Building" value={selectedUnit.building?.name ?? "-"} />
                <Detail
                  label="Floor"
                  value={String(selectedUnit.floor?.level ?? "-")}
                />
                <Detail label="Bedrooms" value={String(selectedUnit.bedrooms)} />
                <Detail label="Bathrooms" value={String(selectedUnit.bathrooms)} />
                <Detail
                  label="Monthly Rent"
                  value={formatCurrency(selectedUnit.monthlyRent)}
                />
                <Detail label="Unit ID" value={selectedUnit.id} />
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0 flex-1">
      <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      {children}
    </label>
  );
}

function CrudPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ActionRow({
  title,
  detail,
  onEdit,
  onArchive,
}: {
  title: string;
  detail: string;
  onEdit: () => void;
  onArchive: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {title}
        </p>
        <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
          {detail}
        </p>
      </div>
      <div className="shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="mr-3 text-sm font-medium text-brand-500 hover:text-brand-600"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onArchive}
          className="text-sm font-medium text-error-500 hover:text-error-600"
        >
          Archive
        </button>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
