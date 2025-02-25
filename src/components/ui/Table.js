
import React from 'react';

export const Table = ({ data, columns }) => {
    if (!data || data.length === 0) {
        return <div className="text-gray-500">Aucune donnée disponible</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full">
                <thead className="bg-gray-50">
                    <tr>
                        {columns.map((column, index) => (
                            <th
                                key={index}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                            >
                                {column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {columns.map((column, colIndex) => {
                                const value = row[column.accessor];
                                return (
                                    <td
                                        key={colIndex}
                                        className={`px-6 py-4 whitespace-nowrap ${column.className ? column.className(value, row) : ''
                                            }`}
                                    >
                                        {column.format ? column.format(value) : value}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};